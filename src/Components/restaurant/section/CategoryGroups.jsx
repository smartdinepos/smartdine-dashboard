import React, { memo, useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Row,
  Col,
  Skeleton,
  Empty,
  Button,
  message,
  Tag,
  Divider,
  Tooltip,
  Popconfirm,
  Modal
} from 'antd';
import {
  EditOutlined,
  ClusterOutlined,
  LinkOutlined,
  FireOutlined,
  PlusOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import {
  useCategoryGroups,
  useCreateCategoryGroup,
  useUpdateCategoryGroup,
  useDeleteCategoryGroup
} from '../../../hooks/useCategoryGroups';
import { useCategories, useUpdateCategory } from '../../../hooks/useCategories';
import CategoryGroupEditModal from './CategoryGroupEditModal';

const { Title, Text, Paragraph } = Typography;

const normalizeId = (value) => (value === undefined || value === null ? '' : String(value));
const getGroupId = (group) =>
  group?._id || group?.id || group?.categoryGroupId || group?.categoryGroupID || null;
const getCategoryGroupId = (cat) =>
  cat?.categoryGroupId || cat?.categoryGroupID || cat?.categoryGroup?._id || cat?.categoryGroup?.id || null;
const getCategoryId = (cat) => cat?._id || cat?.id;

const TRIGGER_LABELS = {
  ON_CATEGORY_GROUP_START: 'On Course Start',
  WHILE_CATEGORY_GROUP_ACTIVE: 'While Course Active',
  ON_CATEGORY_GROUP_END: 'On Course End'
};

function CategoryGroups () {
  const { rid } = useParams();
  const {
    data: groups,
    isLoading: groupsLoading,
    isError: groupsError,
    error: groupsErrorObj,
    refetch: refetchGroups
  } = useCategoryGroups(rid);
  const {
    data: categories,
    isLoading: categoriesLoading,
    refetch: refetchCategories
  } = useCategories(rid);

  const { mutateAsync: createGroup, isPending: creating } = useCreateCategoryGroup();
  const { mutateAsync: updateGroup, isPending: updating } = useUpdateCategoryGroup();
  const { mutateAsync: deleteGroup, isPending: deleting } = useDeleteCategoryGroup();
  const { mutateAsync: updateCategoryMutation } = useUpdateCategory();

  const [editingGroup, setEditingGroup] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const triggerOrder = ['ON_CATEGORY_GROUP_START', 'WHILE_CATEGORY_GROUP_ACTIVE', 'ON_CATEGORY_GROUP_END'];
  const normalizeTrigger = (value = '') => value.toUpperCase();

  const getGroupName = (id) => {
    const g = groups?.find(item => normalizeId(getGroupId(item)) === normalizeId(id));
    return g ? g.name : 'Unknown Group';
  };

  const sortLinkedGroups = (links = []) => {
    return [...links].sort((a, b) => {
      const aIndex = triggerOrder.indexOf(normalizeTrigger(a.triggerEvent));
      const bIndex = triggerOrder.indexOf(normalizeTrigger(b.triggerEvent));
      const aScore = aIndex === -1 ? triggerOrder.length : aIndex;
      const bScore = bIndex === -1 ? triggerOrder.length : bIndex;
      if (aScore !== bScore) return aScore - bScore;
      return (getGroupName(a.targetCategoryGroupId) || '').localeCompare(getGroupName(b.targetCategoryGroupId) || '');
    });
  };

  const updateCategoryGroupAssignment = async ({ catId, nextGroupId }) => {
    try {
      return await updateCategoryMutation({
        restaurantId: rid,
        categoryId: catId,
        data: { categoryGroupId: nextGroupId }
      });
    } catch (error) {
      if (nextGroupId === null && error?.response?.status === 400) {
        try {
          return await updateCategoryMutation({
            restaurantId: rid,
            categoryId: catId,
            data: { categoryGroupId: '' }
          });
        } catch (innerErr) {
          if (innerErr?.response?.status === 400) {
            return updateCategoryMutation({
              restaurantId: rid,
              categoryId: catId,
              data: { $unset: { categoryGroupId: 1 }, categoryGroupId: '' }
            });
          }
          throw innerErr;
        }
      }
      throw error;
    }
  };

  const updateCategoryAssignmentIfNeeded = async ({ catId, isSelected, currentlyAssigned, groupId }) => {
    if (isSelected && !currentlyAssigned) {
      return updateCategoryGroupAssignment({
        catId,
        nextGroupId: groupId
      });
    }
    if (!isSelected && currentlyAssigned) {
      return updateCategoryGroupAssignment({
        catId,
        nextGroupId: null
      });
    }
    return null;
  };

  const handleSave = async (values) => {
    try {
      const groupId = getGroupId(editingGroup);
      const selectedCategoryIds = values.categoryIds || [];
      const selectedIdSet = new Set(selectedCategoryIds.map(normalizeId));
      const normalizedGroupId = normalizeId(groupId);

      const groupPayload = {
        name: values.name,
        isCurrentCategoryGroupEligible: values.isCurrentCategoryGroupEligible,
        ...(values.maxItemsPerGuest !== undefined && { maxItemsPerGuest: values.maxItemsPerGuest }),
        linkedCategoryGroups: values.linkedCategoryGroups || []
      };

      if (isCreating || !groupId) {
        const createdGroup = await createGroup({
          restaurantId: rid,
          data: groupPayload
        });

        const newGroupId = getGroupId(createdGroup);

        if (newGroupId && selectedCategoryIds.length > 0) {
          const assignPromises = selectedCategoryIds.map((catId) =>
            updateCategoryGroupAssignment({ catId, nextGroupId: newGroupId })
          );
          await Promise.all(assignPromises.filter(Boolean));
          refetchCategories();
        }

        message.success('Category group created successfully');
      } else {
        await updateGroup({
          restaurantId: rid,
          categoryGroupId: groupId,
          data: groupPayload
        });

        const updatePromises = (categories || []).map(async (cat) => {
          const catId = getCategoryId(cat);
          const catGroupId = getCategoryGroupId(cat);
          const isSelected = selectedIdSet.has(normalizeId(catId));
          const currentlyAssigned = normalizeId(catGroupId) === normalizedGroupId;

          return updateCategoryAssignmentIfNeeded({
            catId,
            isSelected,
            currentlyAssigned,
            groupId
          });
        });

        await Promise.all(updatePromises.filter(Boolean));
        refetchCategories();
        message.success('Category group updated successfully');
      }

      setEditingGroup(null);
      setIsCreating(false);
      refetchGroups();
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to save category group';
      message.error(errorMsg);
    }
  };

  const handleDelete = async (group) => {
    const groupId = getGroupId(group);
    if (!groupId) return;

    const assignedCategories = (categories || []).filter(
      cat => normalizeId(getCategoryGroupId(cat)) === normalizeId(groupId)
    );

    if (assignedCategories.length > 0) {
      const catNames = assignedCategories.map(c => c.name).join(', ');
      Modal.warning({
        title: 'Cannot Delete Category Group',
        icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
        content: (
          <Space direction='vertical' size={8}>
            <Paragraph>
              This category group has <strong>{assignedCategories.length}</strong> assigned categories ({catNames}).
            </Paragraph>
            <Paragraph type='secondary'>
              Please edit the group or categories to unassign them before deleting.
            </Paragraph>
          </Space>
        ),
        okText: 'Understood'
      });
      return;
    }

    try {
      setDeletingId(groupId);
      await deleteGroup({
        restaurantId: rid,
        categoryGroupId: groupId
      });
      message.success('Category group deleted successfully');
      refetchGroups();
      refetchCategories();
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.data?.message ||
        err?.response?.data?.message ||
        err?.message ||
        'Failed to delete category group';
      message.error(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  if (groupsLoading || categoriesLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 3 }} />
        <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 24 }} />
      </div>
    );
  }

  if (groupsError) {
    return (
      <div style={{ padding: 24 }}>
        <Card>
          <Title level={4}>Failed to load category groups</Title>
          <Text type='danger'>{groupsErrorObj?.message || 'Unknown error occurred while fetching category groups.'}</Text>
          <div style={{ marginTop: 16 }}>
            <Button type='primary' onClick={() => refetchGroups()}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  const sortedGroups = [...(groups || [])].sort((a, b) =>
    (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
  );

  return (
    <div style={{ padding: '4px 0 24px 0' }}>
      {/* Top Header */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Row justify='space-between' align='middle' gutter={[16, 16]}>
          <Col>
            <Space direction='vertical' size={2}>
              <Space align='center' size={8}>
                <ClusterOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                <Title level={4} style={{ margin: 0 }}>Category Groups</Title>
                <Tag color='blue' style={{ borderRadius: 12, margin: 0, fontWeight: 600 }}>
                  {sortedGroups.length}
                </Tag>
              </Space>
              <Text type='secondary' style={{ fontSize: 13 }}>
                Organize menu courses, guest order limits, and automated transitions across meal stages.
              </Text>
            </Space>
          </Col>
          <Col>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              loading={creating}
              onClick={() => {
                setIsCreating(true);
                setEditingGroup({});
              }}
            >
              Add Category Group
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content: List or Empty */}
      {sortedGroups.length === 0
        ? (
          <Card
            style={{
              borderRadius: 12,
              textAlign: 'center',
              padding: '48px 24px',
              border: '1px dashed #d9d9d9',
              background: '#fafafa'
            }}
          >
            <Empty
              description={(
                <Space direction='vertical' size={6}>
                  <Text strong style={{ fontSize: 16 }}>No category groups configured</Text>
                  <Text type='secondary'>
                    Category groups let you pace orders (e.g. Starters → Main Course → Desserts) and set per-guest limits.
                  </Text>
                </Space>
              )}
            >
              <Button
                type='primary'
                icon={<PlusOutlined />}
                size='large'
                style={{ marginTop: 12 }}
                onClick={() => {
                  setIsCreating(true);
                  setEditingGroup({});
                }}
              >
                Create Category Group
              </Button>
            </Empty>
          </Card>
          )
        : (
          <Space direction='vertical' size={16} style={{ width: '100%' }}>
            {sortedGroups.map((group) => {
              const groupId = getGroupId(group);
              const eligible = group.isCurrentCategoryGroupEligible;
              const maxItems = group.maxItemsPerGuest != null ? group.maxItemsPerGuest : 'Unlimited';
              const sortedLinkedGroups = sortLinkedGroups(group.linkedCategoryGroups);

              // Filter categories that belong to this group
              const groupCategories = (categories || []).filter(cat =>
                normalizeId(getCategoryGroupId(cat)) === normalizeId(groupId)
              );

              return (
                <Card
                  key={groupId}
                  style={{
                    borderRadius: 12,
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                  }}
                  bodyStyle={{ padding: 18 }}
                  title={
                    <Row align='middle' justify='space-between' wrap orientation='horizontal' style={{ width: '100%' }}>
                      <Col>
                        <Space size={10} wrap align='center'>
                          <ClusterOutlined style={{ color: '#1677ff', fontSize: 17 }} />
                          <Text strong style={{ fontSize: 16 }}>{group.name}</Text>
                          <Tag color='default' style={{ fontSize: '11px', margin: 0 }}>
                            ID: {groupId}
                          </Tag>
                          <Divider type='vertical' style={{ margin: '0 4px' }} />
                          <Tag color={eligible ? 'success' : 'default'} style={{ margin: 0 }}>
                            {eligible ? 'Eligible as Current Course' : 'Not Eligible as Current Course'}
                          </Tag>
                          <Tag color='geekblue' style={{ margin: 0 }}>
                            Max Items / Guest: {maxItems}
                          </Tag>
                        </Space>
                      </Col>
                    </Row>
                  }
                  extra={
                    <Space size={8}>
                      <Button
                        type='primary'
                        ghost
                        size='small'
                        icon={<EditOutlined />}
                        onClick={() => {
                          setIsCreating(false);
                          setEditingGroup(group);
                        }}
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title='Delete Category Group'
                        description={`Are you sure you want to delete "${group.name}"?`}
                        okText='Yes, Delete'
                        cancelText='Cancel'
                        okButtonProps={{ danger: true, loading: deleting && deletingId === groupId }}
                        onConfirm={() => handleDelete(group)}
                        disabled={deleting && deletingId === groupId}
                      >
                        <Button
                          danger
                          type='text'
                          size='small'
                          icon={<DeleteOutlined />}
                          loading={deleting && deletingId === groupId}
                        />
                      </Popconfirm>
                    </Space>
                  }
                >
                  <Space direction='vertical' size={12} style={{ width: '100%' }}>
                    {/* Assigned Categories */}
                    <div>
                      <Space wrap align='center'>
                        <Text strong style={{ fontSize: 13, color: '#595959' }}>Assigned Categories:</Text>
                        {groupCategories.length > 0
                          ? (
                              groupCategories.map((cat) => (
                                <Tag key={cat._id || cat.id} color='cyan' style={{ margin: 0 }}>
                                  {cat.name}
                                </Tag>
                              ))
                            )
                          : (
                            <Text type='secondary' orientation='left' style={{ fontSize: 12 }}>
                              None assigned (click Edit to assign categories)
                            </Text>
                            )}
                      </Space>
                    </div>

                    {/* Linked Category Groups / Triggers */}
                    <div>
                      <Space wrap align='center'>
                        <Tooltip title='Automated transitions to other category groups based on session dining events'>
                          <Tag
                            icon={<LinkOutlined />}
                            color={sortedLinkedGroups?.length ? 'purple' : 'default'}
                            style={{ margin: 0 }}
                          >
                            {sortedLinkedGroups?.length
                              ? `Linked Transitions (${sortedLinkedGroups.length})`
                              : 'No Linked Transitions'}
                          </Tag>
                        </Tooltip>

                        {sortedLinkedGroups?.length > 0 &&
                          sortedLinkedGroups.map((link, idx) => {
                            const maxPromo = link.maxPromotions != null && link.maxPromotions !== ''
                              ? link.maxPromotions
                              : 'Unlimited';
                            const eventLabel = TRIGGER_LABELS[link.triggerEvent] || link.triggerEvent.replace(/_/g, ' ');
                            return (
                              <Tag
                                key={`${groupId}-link-${idx}`}
                                color='processing'
                                style={{
                                  margin: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  padding: '2px 8px'
                                }}
                              >
                                <FireOutlined style={{ color: '#fa8c16' }} />
                                <span style={{ fontWeight: 600 }}>{eventLabel}</span>
                                <span style={{ opacity: 0.85 }}>→ {getGroupName(link.targetCategoryGroupId)}</span>
                                <span style={{ fontSize: 11, color: '#8c8c8c' }}>({maxPromo} promo)</span>
                              </Tag>
                            );
                          })}
                      </Space>
                    </div>
                  </Space>
                </Card>
              );
            })}
          </Space>
          )}

      {/* Add / Edit Category Group Modal */}
      <CategoryGroupEditModal
        open={!!editingGroup}
        group={editingGroup}
        allGroups={groups || []}
        isCreating={isCreating}
        saving={updating || creating}
        onCancel={() => {
          setEditingGroup(null);
          setIsCreating(false);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

export default memo(CategoryGroups);

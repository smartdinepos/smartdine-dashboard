import React, { memo, useState } from 'react';
import { Card, Typography, Space, Row, Col, Skeleton, Empty, Button, message, Tag, Divider, Badge, Tooltip, Popconfirm } from 'antd';
import { EditOutlined, ClusterOutlined, LinkOutlined, FireOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useCategoryGroups, useCreateCategoryGroup, useUpdateCategoryGroup, useDeleteCategoryGroup } from '../../../hooks/useCategoryGroups';
import { useCategories, useUpdateCategory } from '../../../hooks/useCategories';
import CategoryGroupEditModal from './CategoryGroupEditModal';

const { Title, Text } = Typography;

const normalizeId = (value) => (value === undefined || value === null ? '' : String(value));
const getGroupId = (group) =>
  group?._id || group?.id || group?.categoryGroupId || group?.categoryGroupID || null;
const getCategoryGroupId = (cat) =>
  cat?.categoryGroupId || cat?.categoryGroupID || cat?.categoryGroup?._id || cat?.categoryGroup?.id || null;
const getCategoryId = (cat) => cat?._id || cat?.id;

function CategoryGroups () {
  const { rid } = useParams();
  const { data: groups, isLoading: groupsLoading, isError: groupsError, error: groupsErrorObj, refetch: refetchGroups } = useCategoryGroups(rid);
  const { data: categories, isLoading: categoriesLoading, refetch: refetchCategories } = useCategories(rid);

  const { mutateAsync: createGroup, isPending: creating } = useCreateCategoryGroup();
  const { mutateAsync: updateGroup, isPending: updating } = useUpdateCategoryGroup();
  const { mutateAsync: deleteGroup, isPending: deleting } = useDeleteCategoryGroup();
  const { mutateAsync: updateCategoryMutation } = useUpdateCategory();

  const [editingGroup, setEditingGroup] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const triggerOrder = ['ON_CATEGORY_GROUP_START', 'WHILE_CATEGORY_GROUP_ACTIVE', 'ON_CATEGORY_GROUP_END'];
  const normalizeTrigger = (value = '') => value.toUpperCase();
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
      // Some backends reject null; retry with empty string to clear the link
      if (nextGroupId === null && error?.response?.status === 400) {
        try {
          return await updateCategoryMutation({
            restaurantId: rid,
            categoryId: catId,
            data: { categoryGroupId: '' }
          });
        } catch (innerErr) {
          // Last resort: attempt Mongo-style unset payloads some APIs accept
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
    // Assign if selected and not already assigned; remove if unselected and currently assigned
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

      if (isCreating || !groupId) {
        await createGroup({
          restaurantId: rid,
          data: values
        });
        message.success('Category group created successfully');
      } else {
        await updateGroup({
          restaurantId: rid,
          categoryGroupId: groupId,
          data: values
        });
        message.success('Category group updated successfully');

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
      }

      setEditingGroup(null);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Failed to save category group');
    }
  };

  const getGroupName = (id) => {
    const g = groups?.find(item => normalizeId(getGroupId(item)) === normalizeId(id));
    return g ? g.name : 'Unknown Group';
  };

  const handleDelete = async (group) => {
    const groupId = getGroupId(group);
    if (!groupId) return;
    const assignedCount = (categories || []).filter(
      cat => normalizeId(getCategoryGroupId(cat)) === normalizeId(groupId)
    ).length;
    if (assignedCount > 0) {
      message.warning('Remove categories from this category group before deleting.');
      return;
    }
    try {
      setDeletingId(groupId);
      await deleteGroup({
        restaurantId: rid,
        categoryGroupId: groupId
      });
      message.success('Category group deleted successfully');
      refetchCategories();
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Failed to delete category group');
    } finally {
      setDeletingId(null);
    }
  };

  const containerStyle = {
    // background: 'linear-gradient(135deg, #10396b 0%, #1c578a 45%, #0f9b8e 100%)',
    background: '#F5F7FA',
    padding: 20,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 14px 40px rgba(0,0,0,0.28)',
    color: '#f5f7fb'
  };

  const cardStyle = {
    border: 'none',
    background: 'rgba(255,255,255,0.94)',
    boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
    borderRadius: 14
  };

  if (groupsLoading || categoriesLoading) {
    return (
      <div style={{ padding: 12 }}>
        <Skeleton active paragraph={{ rows: 2 }} />
        <Skeleton active paragraph={{ rows: 2 }} />
      </div>
    );
  }

  if (groupsError) {
    return (
      <div style={{ padding: 16 }}>
        <Title level={4}>Failed to load category groups</Title>
        <Text type='danger'>{groupsErrorObj?.message || 'Unknown error'}</Text>
        <div style={{ marginTop: 12 }}>
          <Button onClick={() => refetchGroups()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return <Empty description='No category groups available' />;
  }

  const sortedGroups = [...groups].sort((a, b) =>
    (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })
  );

  return (
    <>
      <div style={containerStyle}>
        <Row justify='start' align='middle' gutter={12} style={{ marginBottom: 12 }}>
          <Col flex='none'>
            <Space size={12} wrap>
              <Badge color='#40a9ff' />
              <Button
                type='primary'
                icon={<PlusOutlined />}
                loading={creating}
                onClick={() => {
                  setIsCreating(true);
                  setEditingGroup({});
                }}
              >
                Create Category Group
              </Button>
            </Space>
          </Col>
        </Row>

        <Space direction='vertical' size={12} style={{ width: '100%' }}>
          {sortedGroups.map((group) => {
            const groupId = getGroupId(group);
            const eligible = group.isCurrentCategoryGroupEligible;
            const maxItems = group.maxItemsPerGuest ?? 'Unlimited';
            const sortedLinkedGroups = sortLinkedGroups(group.linkedCategoryGroups);

            // Filter categories that belong to this group
            const groupCategories = (categories || []).filter(cat =>
              normalizeId(getCategoryGroupId(cat)) === normalizeId(groupId)
            );

            return (
              <Card
                key={groupId}
                style={cardStyle}
                bodyStyle={{ padding: 16 }}
                title={
                  <Space direction='vertical' size={4} style={{ width: '100%' }}>
                    <Tag color='default' style={{ marginTop: 4, fontSize: '11px', width: 'fit-content' }}>
                      ID: {groupId}
                    </Tag>
                    <Space size={8} wrap align='center'>
                      <ClusterOutlined style={{ color: '#1677ff' }} />
                      <Text strong style={{ fontSize: 16 }}>{group.name}</Text>
                      <Divider type='vertical' style={{ margin: '0 8px', height: '1.2em', top: 0 }} />
                      <Tag color={eligible ? 'success' : 'volcano'} style={{ margin: 0 }}>
                        {eligible ? 'Eligible as Current Group' : 'Not Eligible as Current Group'}
                      </Tag>
                      <Tag color='blue' style={{ margin: 0 }}>
                        Max Items per Guest: {maxItems}
                      </Tag>
                    </Space>
                  </Space>
                }
                extra={
                  <Space>
                    <Button
                      type='primary'
                      ghost
                      icon={<EditOutlined />}
                      onClick={() => setEditingGroup(group)}
                    >
                      Edit
                    </Button>
                    <Popconfirm
                      title='Delete category group?'
                      description='Are you sure you want to delete this group?'
                      okText='Yes, delete'
                      cancelText='Cancel'
                      okButtonProps={{ loading: deleting && deletingId === groupId }}
                      onConfirm={() => handleDelete(group)}
                      disabled={deletingId === groupId}
                    >
                      <Button
                        danger
                        type='text'
                        icon={<DeleteOutlined />}
                        loading={deleting && deletingId === groupId}
                      />
                    </Popconfirm>
                  </Space>
                }
              >
                <Row gutter={[12, 12]} align='middle'>
                  <Col span={24}>
                    {groupCategories.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <Space wrap>
                          <Tag color='purple' style={{ margin: 0 }}>
                            Categories
                          </Tag>
                          {groupCategories.map((cat) => (
                            <Tag key={cat._id || cat.id} color='cyan' style={{ margin: 0 }}>
                              {cat.name}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    <Space wrap>
                      <Tooltip title='Automated triggers to other groups'>
                        <Tag icon={<LinkOutlined />} color={sortedLinkedGroups?.length ? 'geekblue' : 'default'} style={{ margin: 0 }}>
                          {sortedLinkedGroups?.length ? 'Linked Groups' : 'No Linked Groups'}
                        </Tag>
                      </Tooltip>
                      {sortedLinkedGroups?.length
                        ? (
                            sortedLinkedGroups.map((link, idx) => {
                              const maxPromo = link.maxPromotions != null && link.maxPromotions !== ''
                                ? link.maxPromotions
                                : 'Unlimited';
                              return (
                                <Tag
                                  key={`${groupId}-${idx}`}
                                  color='processing'
                                  style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                  <FireOutlined style={{ color: '#fa8c16' }} />
                                  <span style={{ fontWeight: 600 }}>{link.triggerEvent.replace(/_/g, ' ')}</span>
                                  <span style={{ opacity: 0.8 }}>→ {getGroupName(link.targetCategoryGroupId)} ({maxPromo})</span>
                                </Tag>
                              );
                            })
                          )
                        : null}
                    </Space>
                  </Col>
                </Row>
              </Card>
            );
          })}
        </Space>
      </div>

      <CategoryGroupEditModal
        open={!!editingGroup}
        group={editingGroup}
        allGroups={groups}
        isCreating={isCreating}
        saving={updating || creating}
        onCancel={() => {
          setEditingGroup(null);
          setIsCreating(false);
        }}
        onSave={handleSave}
      />
    </>
  );
}

export default memo(CategoryGroups);

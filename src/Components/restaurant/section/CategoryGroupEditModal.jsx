import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Checkbox,
  Tag
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useCategories } from '../../../hooks/useCategories';

const { Text } = Typography;

const TRIGGER_EVENT_OPTIONS = [
  { value: 'ON_CATEGORY_GROUP_START', label: 'On Course Start (ON_CATEGORY_GROUP_START)' },
  { value: 'WHILE_CATEGORY_GROUP_ACTIVE', label: 'While Course Active (WHILE_CATEGORY_GROUP_ACTIVE)' },
  { value: 'ON_CATEGORY_GROUP_END', label: 'On Course End (ON_CATEGORY_GROUP_END)' }
];

const normalizeId = (value) => (value === undefined || value === null ? '' : String(value));

const getCategoryId = (cat) => cat?._id || cat?.id;

const getCategoryGroupId = (cat) => {
  if (!cat) return null;
  return (
    cat.categoryGroupId ||
    cat.categoryGroupID ||
    cat.categoryGroup?._id ||
    cat.categoryGroup?.id ||
    null
  );
};

const getGroupId = (g) => {
  if (!g) return null;
  return g._id || g.id || g.categoryGroupId || g.categoryGroupID || null;
};

const getParentCategoryId = (cat) => {
  const directParent = cat?.parentCategoryId ?? cat?.parentCategoryID ?? cat?.parentId ?? cat?.parentID ?? null;
  if (directParent) return normalizeId(directParent);
  const parentObj = cat?.parentCategory || cat?.parent;
  if (parentObj && typeof parentObj === 'object') {
    return normalizeId(parentObj._id || parentObj.id);
  }
  if (typeof cat?.parentCategory === 'string') return normalizeId(cat.parentCategory);
  return '';
};

const isParentCategory = (cat) => (cat?.type || '').toLowerCase() === 'parent';

const displayOrderLabel = (cat) => (cat?.displayOrder ?? cat?.display_order ?? cat?.order ?? cat?.sortOrder ?? null);

export default function CategoryGroupEditModal ({
  open,
  group,
  allGroups = [],
  isCreating = false,
  saving,
  onCancel,
  onSave
}) {
  const [form] = Form.useForm();
  const { rid } = useParams();
  const { data: categories } = useCategories(rid);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    const getOrder = (cat) => {
      const order = displayOrderLabel(cat);
      return order == null ? Number.POSITIVE_INFINITY : Number(order);
    };
    return [...categories].sort((a, b) => {
      const orderDiff = getOrder(a) - getOrder(b);
      if (orderDiff !== 0) return orderDiff;
      return (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' });
    });
  }, [categories]);

  const referencedParentIds = useMemo(() => {
    const ids = new Set();
    sortedCategories.forEach((cat) => {
      const parentId = getParentCategoryId(cat);
      if (parentId) ids.add(parentId);
    });
    return ids;
  }, [sortedCategories]);

  const parentCategories = useMemo(
    () => sortedCategories.filter((cat) => {
      const catId = normalizeId(getCategoryId(cat));
      return isParentCategory(cat) || referencedParentIds.has(catId);
    }),
    [sortedCategories, referencedParentIds]
  );

  const parentIdSet = useMemo(
    () => new Set(parentCategories.map(cat => normalizeId(getCategoryId(cat)))),
    [parentCategories]
  );

  const hasParentCategories = parentCategories.length > 0;

  const childrenByParent = useMemo(() => {
    const map = new Map();
    sortedCategories.forEach((cat) => {
      const parentId = getParentCategoryId(cat);
      if (!parentId || !parentIdSet.has(parentId)) return;
      if (isParentCategory(cat)) return;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId).push(cat);
    });
    return map;
  }, [sortedCategories, parentIdSet]);

  const ungroupedChildren = useMemo(
    () => sortedCategories.filter((cat) => {
      if (isParentCategory(cat)) return false;
      const parentId = getParentCategoryId(cat);
      if (parentId && parentIdSet.has(parentId)) return false;
      return true;
    }),
    [sortedCategories, parentIdSet]
  );

  useEffect(() => {
    if (open) {
      if (group && !isCreating && getGroupId(group)) {
        const currentGroupId = normalizeId(getGroupId(group));

        // Get child category IDs that belong to this group (exclude parent categories)
        const groupCategoryIds = (sortedCategories || [])
          .filter(cat => {
            const isAssigned = normalizeId(getCategoryGroupId(cat)) === currentGroupId;
            const isParent = isParentCategory(cat) || parentIdSet.has(normalizeId(getCategoryId(cat)));
            return isAssigned && !isParent;
          })
          .map(cat => getCategoryId(cat));

        form.setFieldsValue({
          name: group.name,
          isCurrentCategoryGroupEligible: group.isCurrentCategoryGroupEligible ?? true,
          maxItemsPerGuest: group.maxItemsPerGuest ?? undefined,
          categoryIds: groupCategoryIds,
          linkedCategoryGroups: group.linkedCategoryGroups || []
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          name: undefined,
          isCurrentCategoryGroupEligible: true,
          maxItemsPerGuest: undefined,
          categoryIds: [],
          linkedCategoryGroups: []
        });
      }
    }
  }, [open, group, form, sortedCategories, parentIdSet, isCreating]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      onSave({
        id: isCreating ? null : getGroupId(group),
        name: values.name?.trim(),
        isCurrentCategoryGroupEligible: !!values.isCurrentCategoryGroupEligible,
        maxItemsPerGuest:
          values.maxItemsPerGuest !== undefined && values.maxItemsPerGuest !== null && values.maxItemsPerGuest !== ''
            ? Number(values.maxItemsPerGuest)
            : null,
        categoryIds: values.categoryIds || [],
        linkedCategoryGroups: (values.linkedCategoryGroups || []).map((link) => ({
          triggerEvent: link.triggerEvent,
          targetCategoryGroupId: link.targetCategoryGroupId,
          ...(link.maxPromotions !== undefined && link.maxPromotions !== null && link.maxPromotions !== '' && {
            maxPromotions: Number(link.maxPromotions)
          })
        }))
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const currentGroupId = normalizeId(getGroupId(group));

  const groupsList = [...(allGroups || [])];
  if (!isCreating && currentGroupId && !groupsList.some(g => normalizeId(getGroupId(g)) === currentGroupId)) {
    groupsList.push(group);
  }

  // Include all category groups including the current category group
  const targetGroupOptions = groupsList
    .filter(g => Boolean(normalizeId(getGroupId(g))))
    .map(g => {
      const gId = normalizeId(getGroupId(g));
      const isCurrent = !isCreating && Boolean(currentGroupId && gId === currentGroupId);
      return {
        value: getGroupId(g),
        label: isCurrent ? `${g.name} (Current)` : g.name
      };
    });

  const getAssignedGroupName = (cat) => {
    const assignedId = normalizeId(getCategoryGroupId(cat));
    if (!assignedId) return null;
    if (assignedId === currentGroupId) return null;
    const found = allGroups.find(g => normalizeId(getGroupId(g)) === assignedId);
    return found ? found.name : 'Another group';
  };

  return (
    <Modal
      title={isCreating ? 'Create New Category Group' : 'Edit Category Group'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      width={850}
      destroyOnClose
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          isCurrentCategoryGroupEligible: true,
          categoryIds: [],
          linkedCategoryGroups: []
        }}
      >
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              name='name'
              label='Group Name'
              rules={[{ required: true, message: 'Please enter a category group name' }]}
            >
              <Input placeholder='e.g. Starters, Main Course, Desserts' />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item
              name='maxItemsPerGuest'
              label='Max Items Per Guest'
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder='Unlimited'
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name='isCurrentCategoryGroupEligible'
          valuePropName='checked'
          label='Eligible for Current Group'
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name='categoryIds'
          label='Assign Categories'
        >
          {(!sortedCategories || sortedCategories.length === 0)
            ? (
              <Text type='secondary'>No menu categories available for this restaurant.</Text>
              )
            : (
              <Checkbox.Group style={{ width: '100%' }}>
                {hasParentCategories ? (
                  <Space direction='vertical' size={12} style={{ width: '100%' }}>
                    {parentCategories.map((parentCat) => {
                      const parentId = normalizeId(getCategoryId(parentCat));
                      const childList = childrenByParent.get(parentId) || [];
                      return (
                        <div
                          key={parentId || parentCat.name}
                          style={{
                            padding: '12px 16px',
                            background: '#fafafa',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0'
                          }}
                        >
                          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                            <Tag color='blue' style={{ fontWeight: 600, fontSize: 13, margin: 0, padding: '2px 8px' }}>
                              {parentCat.name || 'Untitled Parent'}
                            </Tag>
                          </div>
                          {childList.length > 0 && (
                            <Row gutter={[8, 8]}>
                              {childList.map((cat) => {
                                const catId = getCategoryId(cat);
                                const otherGroup = getAssignedGroupName(cat);
                                return (
                                  <Col key={catId} xs={24} sm={12} md={8}>
                                    <Checkbox value={catId} style={{ display: 'flex', alignItems: 'center' }}>
                                      <Space size={4} wrap>
                                        <Tag color='cyan' style={{ margin: 0 }}>
                                          {cat.name}
                                        </Tag>
                                        {otherGroup && (
                                          <Tag color='default' style={{ margin: 0, fontSize: 10 }}>
                                            {otherGroup}
                                          </Tag>
                                        )}
                                      </Space>
                                    </Checkbox>
                                  </Col>
                                );
                              })}
                            </Row>
                          )}
                        </div>
                      );
                    })}

                    {ungroupedChildren.length > 0 && (
                      <div
                        style={{
                          padding: '12px 16px',
                          background: '#fafafa',
                          borderRadius: 8,
                          border: '1px solid #f0f0f0'
                        }}
                      >
                        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center' }}>
                          <Tag color='default' style={{ fontWeight: 600, fontSize: 13, margin: 0, padding: '2px 8px' }}>
                            Other Categories
                          </Tag>
                        </div>
                        <Row gutter={[8, 8]}>
                          {ungroupedChildren.map((cat) => {
                            const catId = getCategoryId(cat);
                            const otherGroup = getAssignedGroupName(cat);
                            return (
                              <Col key={catId} xs={24} sm={12} md={8}>
                                <Checkbox value={catId} style={{ display: 'flex', alignItems: 'center' }}>
                                  <Space size={4} wrap>
                                    <Tag color='cyan' style={{ margin: 0 }}>
                                      {cat.name}
                                    </Tag>
                                    {otherGroup && (
                                      <Tag color='default' style={{ margin: 0, fontSize: 10 }}>
                                        {otherGroup}
                                      </Tag>
                                    )}
                                  </Space>
                                </Checkbox>
                              </Col>
                            );
                          })}
                        </Row>
                      </div>
                    )}
                  </Space>
                ) : (
                  <Row gutter={[8, 8]}>
                    {ungroupedChildren.map((cat) => {
                      const catId = getCategoryId(cat);
                      const otherGroup = getAssignedGroupName(cat);
                      return (
                        <Col key={catId} xs={24} sm={12} md={8}>
                          <Checkbox value={catId} style={{ display: 'flex', alignItems: 'center' }}>
                            <Space size={4} wrap>
                              <Tag color='cyan' style={{ margin: 0 }}>
                                {cat.name}
                              </Tag>
                              {otherGroup && (
                                <Tag color='default' style={{ margin: 0, fontSize: 10 }}>
                                  {otherGroup}
                                </Tag>
                              )}
                            </Space>
                          </Checkbox>
                        </Col>
                      );
                    })}
                  </Row>
                )}
              </Checkbox.Group>
              )}
        </Form.Item>

        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <Text strong>Linked Category Groups (Automated Triggers)</Text>
        </div>

        <Form.List name='linkedCategoryGroups'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 10 }}
                  align='baseline'
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'triggerEvent']}
                    rules={[{ required: true, message: 'Select trigger event' }]}
                    style={{ width: 320 }}
                  >
                    <Select
                      placeholder='Select Trigger Event'
                      options={TRIGGER_EVENT_OPTIONS}
                    />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'targetCategoryGroupId']}
                    rules={[{ required: true, message: 'Select target group' }]}
                    style={{ width: 220 }}
                  >
                    <Select
                      placeholder='Target Group'
                      showSearch
                      optionFilterProp='label'
                      options={targetGroupOptions}
                      notFoundContent={
                        targetGroupOptions.length === 0
                          ? 'No groups available'
                          : 'Not found'
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'maxPromotions']}
                    style={{ width: 130 }}
                  >
                    <InputNumber min={0} placeholder='Max Promos' />
                  </Form.Item>

                  <MinusCircleOutlined
                    style={{ color: '#ff4d4f', orientation: 'center', cursor: 'pointer' }}
                    onClick={() => remove(name)}
                  />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type='dashed'
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                  disabled={targetGroupOptions.length === 0}
                >
                  {targetGroupOptions.length === 0
                    ? 'Add Linked Group (Requires at least one group)'
                    : 'Add Linked Group'}
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

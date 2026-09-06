import React, { useEffect } from 'react';
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

  useEffect(() => {
    if (open) {
      if (group && !isCreating && getGroupId(group)) {
        const currentGroupId = normalizeId(getGroupId(group));

        // Get category IDs that belong to this group
        const groupCategoryIds = (categories || [])
          .filter(cat => normalizeId(getCategoryGroupId(cat)) === currentGroupId)
          .map(cat => cat._id || cat.id);

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
  }, [open, group, form, categories, isCreating]);

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
              tooltip='Limit how many items a guest can order from this group during this course. Leave empty for unlimited.'
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
          tooltip='Whether this group can be selected as the active dining course on guest devices.'
        >
          <Switch />
        </Form.Item>

        <Form.Item
          name='categoryIds'
          label='Assign Categories'
          tooltip='Select categories that belong to this group. Categories assigned here will be linked to this category group.'
        >
          {(!categories || categories.length === 0)
            ? (
              <Text type='secondary'>No menu categories available for this restaurant.</Text>
              )
            : (
              <Checkbox.Group style={{ width: '100%' }}>
                <Row gutter={[8, 8]}>
                  {categories.map((cat) => {
                    const catId = cat._id || cat.id;
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
              </Checkbox.Group>
              )}
        </Form.Item>

        <div style={{ marginTop: 16, marginBottom: 12 }}>
          <Text strong>Linked Category Groups (Automated Triggers)</Text>
          <Text type='secondary' style={{ display: 'block', fontSize: 13 }}>
            Define automated course transition rules to trigger other category groups based on session events.
          </Text>
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

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
const { Option } = Select;

const TRIGGER_EVENTS = [
  'ON_CATEGORY_GROUP_START',
  'ON_CATEGORY_GROUP_END',
  'WHILE_CATEGORY_GROUP_ACTIVE'
];

const normalizeId = (value) => (value === undefined || value === null ? '' : String(value));

const getCategoryGroupId = cat => {
  if (!cat) return null;
  return (
    cat.categoryGroupId ||
    cat.categoryGroupID ||
    cat.categoryGroup?._id ||
    cat.categoryGroup?.id ||
    null
  );
};

const getGroupId = g => {
  if (!g) return null;
  return g._id || g.id || g.categoryGroupId || g.categoryGroupID || null;
};

export default function CategoryGroupEditModal({
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
    if (open && group && !isCreating && getGroupId(group)) {
      const currentGroupId = normalizeId(getGroupId(group));

      // Get category IDs that belong to this group
      const groupCategoryIds = (categories || [])
        .filter(cat => normalizeId(getCategoryGroupId(cat)) === currentGroupId)
        .map(cat => cat._id || cat.id);

      form.setFieldsValue({
        name: group.name,
        isCurrentCategoryGroupEligible: group.isCurrentCategoryGroupEligible,
        maxItemsPerGuest: group.maxItemsPerGuest,
        categoryIds: groupCategoryIds,
        linkedCategoryGroups: group.linkedCategoryGroups || []
      });
    } else {
      form.setFieldsValue({
        name: undefined,
        isCurrentCategoryGroupEligible: true,
        maxItemsPerGuest: undefined,
        categoryIds: [],
        linkedCategoryGroups: []
      });
    }
  }, [open, group, form, categories, isCreating]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      onSave({
        id: getGroupId(group),
        ...values,
        linkedCategoryGroups: values.linkedCategoryGroups || []
      });
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const targetGroupOptions = (allGroups || [])
    .map(g => ({
      __id: getGroupId(g),
      name: g.name
    }))
    .filter(g => g.__id);

  return (
    <Modal
      title={isCreating ? 'Create New Category Group' : 'Edit Category Group'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={saving}
      width={900}
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
          <Col span={12}>
            <Form.Item
              name='name'
              label='Name'
              rules={[{ required: true, message: 'Please enter a name' }]}
            >
              <Input placeholder='e.g. Starters' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='maxItemsPerGuest'
              label='Max Items Per Guest'
              tooltip='Leave empty for no limit'
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder='No limit'
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name='categoryIds'
          label='Categories'
        >
          <Checkbox.Group style={{ width: '100%' }}>
            <Space wrap>
              {(categories || []).map((cat) => (
                <Checkbox key={cat._id || cat.id} value={cat._id || cat.id}>
                  <Tag color='cyan' style={{ margin: 0 }}>
                    {cat.name}
                  </Tag>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </Form.Item>

        <Form.Item
          name='isCurrentCategoryGroupEligible'
          valuePropName='checked'
          label='Eligible for Promotions'
        >
          <Switch />
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Linked Category Groups</Text>
          <Text type='secondary' style={{ display: 'block', marginBottom: 8 }}>
            Define rules to trigger other category groups based on events.
          </Text>
        </div>

        <Form.List name='linkedCategoryGroups'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Space
                  key={key}
                  style={{ display: 'flex', marginBottom: 8 }}
                  align='baseline'
                >
                  <Form.Item
                    {...restField}
                    name={[name, 'triggerEvent']}
                    rules={[{ required: true, message: 'Missing trigger' }]}
                    style={{ width: 300 }}
                  >
                    <Select placeholder='Trigger Event'>
                      {TRIGGER_EVENTS.map(ev => (
                        <Option key={ev} value={ev}>
                          {ev}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'targetCategoryGroupId']}
                    rules={[{ required: true, message: 'Missing target group' }]}
                    style={{ width: 200 }}
                  >
                    <Select
                      placeholder='Target Group'
                      showSearch
                      optionFilterProp='label'
                      filterOption={(input, option) =>
                        (option?.label || '')
                          .toLowerCase()
                          .includes(input.toLowerCase())}
                      options={targetGroupOptions.map(g => ({
                        value: g.__id, // id goes to backend
                        label: g.name // name shown to admin
                      }))}
                    />
                  </Form.Item>

                  <Form.Item
                    {...restField}
                    name={[name, 'maxPromotions']}
                    style={{ width: 120 }}
                  >
                    <InputNumber min={0} placeholder='Max Promos' />
                  </Form.Item>

                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type='dashed'
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Add Linked Group
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

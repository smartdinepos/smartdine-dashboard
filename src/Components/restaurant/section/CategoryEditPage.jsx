import { Card, Typography, Form, Input, InputNumber, Select, Button, Skeleton, Alert, Space, Checkbox, message } from 'antd';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategories, useUpdateCategory } from '../../../hooks/useCategories';
import { useMenuItems } from '../../../hooks/useMenuItems';

const { Text } = Typography;
const { Option } = Select;

const normalizeId = (value) => (value === undefined || value === null ? '' : String(value));

const itemBelongsToCategory = (item, category) => {
  if (!item || !category) return false;
  const targetId = normalizeId(category._id || category.id);
  if (targetId && normalizeId(item.categoryId) === targetId) return true;
  return (item.category || '') === (category.name || '');
};

export default function CategoryEditPage () {
  const { rid, categoryId } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const { data: categories, isLoading, isError, error, refetch, isFetching } = useCategories(rid);
  const { data: menuData } = useMenuItems(rid);
  const { mutateAsync: updateCategory, isPending: updating } = useUpdateCategory();

  const menuItems = menuData?.items || [];
  const category = (categories || []).find(cat => normalizeId(cat._id || cat.id) === normalizeId(categoryId));

  useEffect(() => {
    if (category) {
      form.setFieldsValue({
        name: category.name,
        displayOrder: category.displayOrder ?? null,
        type: category.type || 'child'
      });
    }
  }, [category, form]);

  const handleSubmit = async () => {
    try {
      const { name, displayOrder } = await form.validateFields(['name', 'displayOrder']);
      await updateCategory({
        restaurantId: rid,
        categoryId,
        data: {
          name,
          displayOrder: displayOrder ?? null
        }
      });
      message.success('Category updated');
      navigate(-1);
    } catch (err) {
      if (err?.errorFields) return;
      console.error(err);
      message.error(err?.response?.data?.message || 'Failed to update category');
    }
  };

  if (isLoading || isFetching) {
    return <Skeleton active paragraph={{ rows: 4 }} style={{ padding: 12 }} />;
  }

  if (isError) {
    return (
      <Card>
        <Alert
          type='error'
          message='Failed to load category'
          description={error?.message || 'Unknown error'}
          action={<a onClick={() => refetch()}>Retry</a>}
        />
      </Card>
    );
  }

  if (!category) {
    return <Alert type='warning' message='Category not found' />;
  }

  const itemsInCategory = menuItems.filter(item => itemBelongsToCategory(item, category));

  return (
    <Card title='Edit Category' bodyStyle={{ padding: 16 }}>
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          type: 'child',
          displayOrder: null
        }}
      >
        <Form.Item
          name='name'
          label='Name'
          rules={[{ required: true, message: 'Please enter a category name' }]}
        >
          <Input placeholder='e.g. Starters' />
        </Form.Item>

        <Form.Item
          name='displayOrder'
          label='Display Order'
          tooltip='Lower numbers appear first. Leave empty to append at the end.'
        >
          <InputNumber min={0} style={{ width: '100%' }} placeholder='Optional' />
        </Form.Item>

        <Form.Item
          name='type'
          label='Type'
          tooltip='Type is set during creation and cannot be changed later.'
        >
          <Select disabled>
            <Option value='child'>Child</Option>
            <Option value='parent'>Parent</Option>
          </Select>
        </Form.Item>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Items in this category</Text>
          <div style={{ maxHeight: 260, overflow: 'auto', marginTop: 8, padding: 8, border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <Checkbox.Group style={{ width: '100%' }} value={itemsInCategory.map(i => i._id || i.id)} disabled>
              <Space direction='vertical'>
                {itemsInCategory.length > 0
                  ? itemsInCategory.map(item => (
                    <Checkbox key={item._id || item.id} value={item._id || item.id}>
                      {item.name || 'Untitled item'}
                    </Checkbox>
                  ))
                  : <Text type='secondary'>No items assigned</Text>}
              </Space>
            </Checkbox.Group>
          </div>
          <Text type='secondary'>Items list is read-only; editing updates only the category details.</Text>
        </div>

        <Space>
          <Button type='primary' onClick={handleSubmit} loading={updating}>
            Save
          </Button>
          <Button onClick={() => navigate(-1)}>Cancel</Button>
        </Space>
      </Form>
    </Card>
  );
}

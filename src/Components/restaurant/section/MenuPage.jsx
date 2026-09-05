import { useState, useMemo } from 'react';
import {
  Collapse, Row, Col, Card, Tag, Typography, Space, Button,
  Skeleton, Empty, message
} from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useMenuItems, useUpdateMenuItem } from '../../../hooks/useMenuItems';
import { useCategories } from '../../../hooks/useCategories';
import MenuItemEditModal from './MenuItemEditModal';
import { getPrimaryMenuUrl } from '../../../utils/images';

const { Title, Text, Paragraph } = Typography;

const normalizeId = (val) => (val === undefined || val === null ? '' : String(val).trim());

function TagPill({ text }) {
  const raw = String(text || '');
  const t = raw.toLowerCase().trim();
  const isNonVeg =
    /(^|\W)non[\s-]*veg/i.test(raw) || t.includes('non-vegetarian') || t.includes('non vegetarian');
  const isVeg = !isNonVeg && (t.includes('veg') || t.includes('vegetarian'));
  const isBestseller = t.includes('bestseller');
  const color = isNonVeg ? 'red' : isVeg ? 'green' : isBestseller ? 'gold' : 'blue';
  return <Tag color={color} style={{ borderRadius: 12, padding: '0 8px' }}>{raw}</Tag>;
}

function PromotedTag() {
  return (
    <Tag color="green" style={{ borderRadius: 12, padding: '0 8px' }}>
      Promoted
    </Tag>
  );
}

// Helper: group items strictly by item.categoryId, resolving category name from categories
function groupByCategory(items = [], categoryMap = new Map()) {
  const map = new Map();
  for (const it of items) {
    const catId = normalizeId(it.categoryId);
    const cat = catId ? categoryMap.get(catId) : null;
    const label = cat?.name || (catId ? 'Unknown Category' : 'Uncategorized');
    const groupKey = catId || '__uncategorized__';

    if (!map.has(groupKey)) {
      const order = cat?.displayOrder ?? cat?.display_order ?? cat?.order ?? cat?.sortOrder ?? null;
      map.set(groupKey, {
        categoryId: catId,
        categoryName: label,
        displayOrder: order == null ? (catId ? 100000 : Number.POSITIVE_INFINITY) : Number(order),
        items: []
      });
    }
    map.get(groupKey).items.push(it);
  }
  return map;
}

export default function MenuPage() {
  const { rid } = useParams();

  // fetch ALL items (no pagination UI) and categories
  const { data, isLoading, isError, error, refetch, isFetching } = useMenuItems(rid);
  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories(rid);
  const { mutateAsync: saveItem, isPending: saving } = useUpdateMenuItem(rid);

  const [editing, setEditing] = useState(null);

  const items = data?.items ?? [];

  const categoryMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach((cat) => {
      const id = normalizeId(cat._id || cat.id);
      if (id) {
        map.set(id, cat);
      }
    });
    return map;
  }, [categories]);

  // Sort by displayOrder then by name (like POS)
  const sorted = useMemo(() => {
    const list = items || [];
    return [...list].sort((a, b) => {
      const ao = a.displayOrder ?? 100000;
      const bo = b.displayOrder ?? 100000;
      if (ao !== bo) return ao - bo;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [items]);

  // Build Collapse panels from category groups (grouped strictly by item.categoryId)
  const collapseItems = useMemo(() => {
    const groups = groupByCategory(sorted, categoryMap);
    const panels = [];
    for (const [key, group] of groups.entries()) {
      panels.push({
        key,
        displayOrder: group.displayOrder,
        categoryName: group.categoryName,
        label: (
          <div className='menu-cat-header'>
            <span className='menu-cat-title'>{group.categoryName}</span>
          </div>
        ),
        children: (
          <Space direction='vertical' size={16} style={{ width: '100%' }}>
            {group.items.map((item) => {
              const thumb = getPrimaryMenuUrl(item.images);
              return (
                <Card key={item._id} bodyStyle={{ padding: 16 }} style={{ borderRadius: 10 }}>
                  <Row gutter={16} align='middle'>
                    <Col xs={24} md={18}>
                      <Space size='small' style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                        {(item.tags || []).map((t, i) => <TagPill key={i} text={t} />)}
                        {(item.isRestaurantPromoted || item.isRestaurantRecomended || item.isRestaurantRecommended || item.isRecomended) && (
                          <PromotedTag />
                        )}
                      </Space>

                      <Title level={4} style={{ margin: 0 }}>
                        {item.name || 'Untitled item'}
                      </Title>

                      {item.description
                        ? (
                          <Paragraph
                            type='secondary'
                            style={{ marginTop: 6 }}
                            ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
                          >
                            {item.description}
                          </Paragraph>
                        )
                        : (
                          <Text type='secondary'>No description provided.</Text>
                        )}
                    </Col>

                    {/* RIGHT: image + Edit on far right */}
                    <Col xs={24} md={6} style={{ display: 'flex' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                        <div
                          style={{
                            width: 140,
                            height: 100,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#f5f5f5',
                            position: 'relative',
                            marginRight: 4
                          }}
                        >
                          {thumb
                            ? (
                              <img
                                src={thumb}
                                alt={item.name || 'menu image'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              />
                            )
                            : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  display: 'grid',
                                  placeItems: 'center',
                                  color: '#999'
                                }}
                              >
                                No image
                              </div>
                            )}
                        </div>

                        <Button
                          size='large'
                          type='primary'
                          icon={<EditOutlined />}
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Space>
        )
      });
    }
    // Sort panels by category displayOrder then category name
    panels.sort((a, b) => {
      const orderA = a.displayOrder ?? 100000;
      const orderB = b.displayOrder ?? 100000;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.categoryName || '').localeCompare(String(b.categoryName || ''));
    });
    return panels;
  }, [sorted, categoryMap]);

  return (
    <div style={{ paddingRight: 8 }}>
      {/* Loading */}
      {(isLoading || isCategoriesLoading) && (
        <div style={{ padding: 12 }}>
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
          <Skeleton active paragraph={{ rows: 2 }} />
        </div>
      )}

      {/* Error */}
      {!isLoading && !isCategoriesLoading && isError && (
        <div style={{ padding: 16 }}>
          <Title level={4}>Failed to load menu</Title>
          <Text type='danger'>{error?.message || 'Unknown error'}</Text>
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => refetch()} loading={isFetching}>Retry</Button>
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isCategoriesLoading && !isError && (
        <>
          {items.length === 0
            ? <Empty description='No menu items yet' />
            : (
              <Collapse
                accordion={false}
                bordered={false}
                items={collapseItems}
                expandIconPosition='start'
                defaultActiveKey={collapseItems.map(i => i.key)}
                style={{ background: 'transparent' }}
              />
            )
          }

          <MenuItemEditModal
            open={!!editing}
            item={{
              ...editing,
              category: categoryMap.get(normalizeId(editing?.categoryId))?.name || editing?.category || '',
              restaurantId: rid
            }}
            categoryItems={items.filter(i => normalizeId(i.categoryId) === normalizeId(editing?.categoryId))}
            saving={saving}
            onCancel={() => setEditing(null)}
            onItemUpdated={(updatedItem) => {
              setEditing(prev => (prev ? { ...prev, ...updatedItem } : null));
              refetch();
            }}
            onSave={async (payload) => {
              try {
                await saveItem({ itemId: editing._id, data: payload });
                message.success('Menu item updated');
                setEditing(null);
                refetch(); // refresh full list
              } catch (e) {
                message.error(e?.response?.data?.message || e.message || 'Failed to update');
              }
            }}
            supportsMultipart={false}
          />
        </>
      )}
    </div>
  );
}

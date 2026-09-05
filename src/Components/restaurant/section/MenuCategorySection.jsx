import { memo } from 'react';
import { Row, Col, Card, Typography, Space, Button, Tag } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { getPrimaryMenuUrl } from '../../../utils/images';

const { Title, Text, Paragraph } = Typography;

function TagPill ({ text }) {
  const raw = String(text || '');
  const t = raw.toLowerCase();
  const isNonVeg = /(^|\W)non[\s-]*veg/i.test(raw) || t.includes('non-vegetarian') || t.includes('non vegetarian');
  const isVeg = !isNonVeg && (t.includes('veg') || t.includes('vegetarian'));
  const isBest = t.includes('bestseller');
  const color = isNonVeg ? 'red' : isVeg ? 'green' : isBest ? 'gold' : 'blue';
  return <Tag color={color} style={{ borderRadius: 12, padding: '0 8px' }}>{raw}</Tag>;
}

function MenuCategorySection ({ items, onEdit }) {
  return (
    <Space direction='vertical' size={16} style={{ width: '100%' }}>
      {items.map(item => {
        const thumbUrl = getPrimaryMenuUrl(item.images) || (typeof item.images?.[0] === 'string' ? item.images[0] : item.images?.[0]?.url);
        return (
          <Card key={item._id} bodyStyle={{ padding: 16 }} style={{ borderRadius: 10 }}>
            <Row gutter={16} align='middle'>
              {/* LEFT: text */}
              <Col xs={24} md={18}>
                <Space size='small' style={{ marginBottom: 6, flexWrap: 'wrap' }}>
                  {(item.tags || []).map((t, i) => <TagPill key={i} text={t} />)}
                </Space>

                <Title level={4} style={{ margin: 0 }}>{item.name || 'Untitled item'}</Title>

                {item.description
                  ? (
                    <Paragraph
                      type='secondary'
                      ellipsis={{ rows: 2, expandable: false }}
                      style={{ marginTop: 6, marginBottom: 8 }}
                    >
                      {item.description}
                    </Paragraph>
                    )
                  : null}

                <Text strong style={{ fontSize: 16 }}>
                  ₹{(Number(item.price) || 0).toFixed(2)}
                </Text>
              </Col>

              {/* RIGHT: image + edit button */}
              <Col xs={24} md={6} style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
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
                  {thumbUrl
                    ? (
                      <img
                        src={thumbUrl}
                        alt={item.name || 'menu image'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      )
                    : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#999' }}>
                        No image
                      </div>
                      )}
                </div>

                <Button
                  size='large'
                  type='primary'
                  icon={<EditOutlined />}
                  onClick={() => onEdit(item)}
                  style={{ marginLeft: 'auto' }}
                >
                  Edit
                </Button>
              </Col>
            </Row>
          </Card>
        );
      })}
    </Space>
  );
}

export default memo(MenuCategorySection);

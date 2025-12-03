import { Menu, Avatar, Typography, Divider, Button, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TableOutlined,
  DollarOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  MenuFoldOutlined,
  GroupOutlined,
  TagsOutlined
} from '@ant-design/icons';
import { useLocation, Link } from 'react-router-dom';

const { Text } = Typography;

export default function SidebarNav ({
  rid,
  collapsed,
  onToggle,
  navState,
  restaurant
}) {
  const location = useLocation();
  const { pathname } = location;

  const name = restaurant?.name ?? 'Restaurant';
  const logoUrl = restaurant?.logoUrl;
  const base = `/restaurants/${rid}`;

  const items = [
    { key: `${base}/menu`, icon: <AppstoreOutlined />, label: <Link to={`${base}/menu`} state={navState}>Menu</Link> },
    { key: `${base}/category-groups`, icon: <GroupOutlined />, label: <Link to={`${base}/category-groups`} state={navState}>Category Groups</Link> },
    { key: `${base}/categories`, icon: <TagsOutlined />, label: <Link to={`${base}/categories`} state={navState}>Categories</Link> },
    { key: `${base}/upsell`, icon: <RiseOutlined />, label: <Link to={`${base}/upsell`} state={navState}>Upsell</Link> },
    { key: `${base}/orders`, icon: <ShoppingCartOutlined />, label: <Link to={`${base}/orders`} state={navState}>Orders</Link> },
    { key: `${base}/tables`, icon: <TableOutlined />, label: <Link to={`${base}/tables`} state={navState}>Tables</Link> },
    { key: `${base}/billing`, icon: <DollarOutlined />, label: <Link to={`${base}/billing`} state={navState}>Billing</Link> },
    { key: `${base}/settings`, icon: <SettingOutlined />, label: <Link to={`${base}/settings`} state={navState}>Settings</Link> },
    { key: `${base}/help`, icon: <QuestionCircleOutlined />, label: <Link to={`${base}/help`} state={navState}>Help</Link> }
  ];

  const selected = items.map(i => i.key).find(k => pathname.startsWith(k)) ?? `${base}/menu`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: collapsed ? '12px 0' : 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 10,
          cursor: collapsed ? 'pointer' : 'default' // 👈 make header clickable when collapsed
        }}
        onClick={collapsed ? onToggle : undefined} // 👈 click logo to expand
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar src={logoUrl} shape='square' size={36}>
            {(name?.[0] || 'R').toUpperCase()}
          </Avatar>
          {!collapsed && (
            <Text strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </Text>
          )}
        </div>

        {/* Only show the collapse button when expanded */}
        {!collapsed && (
          <Tooltip title='Collapse'>
            <Button type='text' size='small' icon={<MenuFoldOutlined />} onClick={onToggle} />
          </Tooltip>
        )}

      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Menu
        mode='inline'
        selectedKeys={[selected]}
        items={items}
        style={{ borderRight: 0, flex: 1 }}
        inlineCollapsed={collapsed}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Select,
  Space,
  Row,
  Col,
  Button,
  Input,
  Tag,
  message,
  Alert,
  Skeleton,
  Empty,
  InputNumber,
  Divider
} from 'antd';
import { ReloadOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import { useMenuItems, useUpdateMenuItem } from '../../../hooks/useMenuItems';

const { Title, Text } = Typography;
const { Search } = Input;

const normalizeForCompare = (list = []) => {
  return [...list]
    .map((c) => ({
      id: c?.id ? String(c.id) : '',
      quantity: c?.quantity == null ? null : Number(c.quantity) || 1,
      smartDineRank: c?.smartDineRank == null ? null : Number(c.smartDineRank) || 0
    }))
    .filter((c) => c.id)
    .sort((a, b) =>
      a.id.localeCompare(b.id) ||
      Number(a.smartDineRank || 0) - Number(b.smartDineRank || 0) ||
      Number(a.quantity || 0) - Number(b.quantity || 0)
    );
};

const sameCombos = (a = [], b = []) => {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na.length !== nb.length) return false;
  return na.every((c, i) =>
    c.id === nb[i].id &&
    c.quantity === nb[i].quantity &&
    c.smartDineRank === nb[i].smartDineRank
  );
};

const makeEmptyCombo = (rank = 1) => ({
  id: '',
  quantity: 1,
  smartDineRank: rank
});

export default function UpsellPage () {
  const { rid } = useParams();
  const { data, isLoading, isError, error, refetch, isFetching } = useMenuItems(rid);
  const { mutateAsync: updateItem, isPending } = useUpdateMenuItem(rid);

  const items = data?.items ?? [];

  // Base combos from API (used to detect dirty state)
  const baseCombos = useMemo(() => {
    const map = {};
    items.forEach((it) => {
      map[it._id] = Array.isArray(it.comboItems) ? it.comboItems : [];
    });
    return map;
  }, [items]);

  const [draftCombos, setDraftCombos] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState('');

  // Reset drafts when server combos change, but avoid infinite loops by skipping no-op updates
  useEffect(() => {
    setDraftCombos((prev) => {
      if (!baseCombos || prev === baseCombos) return prev;

      const prevKeys = Object.keys(prev || {});
      const nextKeys = Object.keys(baseCombos || {});
      if (prevKeys.length === nextKeys.length && prevKeys.every((k) => nextKeys.includes(k))) {
        const unchanged = prevKeys.every((k) => sameCombos(prev[k], baseCombos[k]));
        if (unchanged) return prev;
      }
      return baseCombos;
    });
  }, [baseCombos]);

  // Pick a default item once items are available
  useEffect(() => {
    if (!selectedId && items.length) setSelectedId(items[0]._id);
  }, [items, selectedId]);

  const menuOptions = useMemo(
    () => items.map((it) => ({
      value: it._id,
      label: it.name || 'Untitled',
      category: it.category || ''
    })),
    [items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items;
    if (!q) return list;
    return list.filter((it) => {
      const n = (it.name || '').toLowerCase();
      const c = (it.category || '').toLowerCase();
      return n.includes(q) || c.includes(q);
    });
  }, [items, search]);

  const groupedItems = useMemo(() => {
    const groups = filteredItems.reduce((acc, it) => {
      const cat = (it.category || '').trim() || 'Uncategorized';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(it);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, list]) => ({
        category,
        items: list.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      }));
  }, [filteredItems]);

  const selectedItem = items.find((it) => it._id === selectedId) || filteredItems[0] || null;
  const selectedCombos = draftCombos[selectedItem?._id] || [];
  const baseForSelected = baseCombos[selectedItem?._id] || [];
  const dirty = !sameCombos(selectedCombos, baseForSelected);

  const updateComboAt = (index, patch) => {
    setDraftCombos((prev) => {
      const current = prev[selectedItem?._id] || [];
      const next = current.map((c, i) => (i === index ? { ...c, ...patch } : c));
      return { ...prev, [selectedItem?._id]: next };
    });
  };

  const removeComboAt = (index) => {
    setDraftCombos((prev) => {
      const current = prev[selectedItem?._id] || [];
      const next = current.filter((_c, i) => i !== index);
      return { ...prev, [selectedItem?._id]: next };
    });
  };

  const addComboRow = () => {
    setDraftCombos((prev) => {
      const current = prev[selectedItem?._id] || [];
      return { ...prev, [selectedItem?._id]: [...current, makeEmptyCombo(current.length + 1)] };
    });
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    // clean payload: drop empty rows, normalize numbers, ensure ranks
    const comboItems = normalizeForCompare(selectedCombos).map((c, idx) => ({
      id: c.id,
      quantity: c.quantity == null || c.quantity === '' ? null : Number(c.quantity) || 1,
      smartDineRank:
        c.smartDineRank == null || c.smartDineRank === ''
          ? null
          : Number(c.smartDineRank) || idx + 1
    }));

    try {
      setSavingId(selectedItem._id);
      const updated = await updateItem({ itemId: selectedItem._id, data: { comboItems } });

      // sync drafts with server response to avoid stale rows
      const updatedCombos = Array.isArray(updated?.comboItems) ? updated.comboItems : comboItems;
      setDraftCombos((prev) => ({ ...prev, [selectedItem._id]: updatedCombos }));

      message.success(`Combo for ${selectedItem.name || 'item'} updated successfully`);
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to update combos';
      message.error(msg);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Upsell Combos</Title>
          <Text type='secondary'>Pick an item, configure its combos (item + quantity + rank), then save.</Text>
        </div>
        <Button onClick={() => refetch()} loading={isFetching} icon={<ReloadOutlined />}>
          Refresh
        </Button>
      </Space>

      <Space style={{ marginBottom: 12, width: '100%', flexWrap: 'wrap', gap: 8 }}>
        <Search
          placeholder='Filter items by name or category'
          allowClear
          onChange={(e) => setSearch(e.target.value)}
          value={search}
          style={{ maxWidth: 360 }}
        />
        <Text type='secondary'>
          Categories: {Array.from(new Set(items.map((it) => it.category).filter(Boolean))).sort().join(', ') || 'None'}
        </Text>
      </Space>

      {isError && (
        <Alert
          type='error'
          showIcon
          message='Failed to load menu'
          description={error?.message || 'Please try again.'}
          action={<Button size='small' onClick={() => refetch()}>Retry</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      {isLoading && (
        <div>
          <Skeleton active />
          <Skeleton active />
        </div>
      )}

      {!isLoading && filteredItems.length === 0 && (
        <Empty description={search ? 'No items match this filter' : 'No menu items found'} />
      )}

      {!isLoading && filteredItems.length > 0 && (
        <Row gutter={[16, 16]}>
          {/* Left: item list */}
          <Col xs={24} md={8} lg={6}>
            <Card
              styles={{ body: { padding: 12, maxHeight: '75vh', overflowY: 'auto' } }}
              style={{ borderRadius: 10, position: 'sticky', top: 76 }}
            >
              <Space direction='vertical' style={{ width: '100%' }}>
                {groupedItems.map(({ category, items: list }) => (
                  <div key={category}>
                    <Text strong>{category}</Text>
                    <Space direction='vertical' style={{ width: '100%', paddingLeft: 8 }}>
                      {list.map((it) => {
                        const isActive = selectedItem?._id === it._id;
                        return (
                          <Button
                            key={it._id}
                            type={isActive ? 'primary' : 'default'}
                            block
                            style={{ textAlign: 'left', display: 'block', overflow: 'hidden' }}
                            onClick={() => setSelectedId(it._id)}
                          >
                            <div
                              style={{
                                display: 'block',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                              title={it.name || 'Untitled item'}
                            >
                              {it.name || 'Untitled item'}
                            </div>
                          </Button>
                        );
                      })}
                    </Space>
                  </div>
                ))}
              </Space>
            </Card>
          </Col>

          {/* Right: combo editor */}
          <Col xs={24} md={16} lg={18}>
            <Card
              styles={{ body: { padding: 16 } }}
              style={{ borderRadius: 10, minHeight: 360 }}
              title={selectedItem ? `${selectedItem.name || 'Untitled item'} combos` : 'Select an item'}
              extra={dirty ? <Tag color='blue'>Unsaved</Tag> : null}
            >
              {!selectedItem && <Text type='secondary'>Choose an item from the left to configure combos.</Text>}

              {selectedItem && (
                <Space direction='vertical' style={{ width: '100%' }} size={12}>
                  <Space>
                    {selectedItem.category && (
                      <Tag color='geekblue'>{selectedItem.category}</Tag>
                    )}
                  </Space>

          <Divider style={{ margin: '8px 0' }} />

                  {selectedCombos.length === 0 && (
                    <Alert
                      type='info'
                      showIcon
                      message='No combos configured yet'
                      description='Add items to bundle with this dish. Set quantity, preference notes, and ranking order.'
                    />
                  )}

                  <Space direction='vertical' style={{ width: '100%' }} size={10}>
                    {selectedCombos.length > 0 && (
                      <>
                        <Row gutter={8} style={{ padding: '0 4px' }}>
                          <Col xs={24} md={10}>
                            <Text type='secondary' style={{ fontSize: 12 }}>Select combo item</Text>
                          </Col>
                          <Col xs={8} md={4}>
                            <Text type='secondary' style={{ fontSize: 12 }}>Quantity</Text>
                          </Col>
                          <Col xs={8} md={4}>
                            <Text type='secondary' style={{ fontSize: 12 }}>Rank</Text>
                          </Col>
                          <Col xs={24} md={2} />
                        </Row>

                        {selectedCombos.map((combo, idx) => (
                          <Card
                            key={idx}
                            size='small'
                            style={{ borderRadius: 8, background: '#fafafa' }}
                            styles={{ body: { padding: 12 } }}
                          >
                            <Row gutter={8} align='middle'>
                              <Col xs={24} md={10}>
                                <Select
                                  showSearch
                                  placeholder='Select combo item'
                                  value={combo.id || undefined}
                                  onChange={(val) => updateComboAt(idx, { id: val })}
                                  style={{ width: '100%' }}
                                  options={menuOptions.filter((opt) => opt.value !== selectedItem._id)}
                                  optionFilterProp='label'
                                  filterOption={(input, option) => {
                                    const haystack = `${option?.label ?? ''} ${option?.category ?? ''}`.toLowerCase();
                                    return haystack.includes(input.toLowerCase());
                                  }}
                                  styles={{ popup: { maxHeight: 280, overflow: 'auto' } }}
                                />
                              </Col>
                              <Col xs={8} md={4}>
                                <InputNumber
                                  min={1}
                                  value={combo.quantity}
                                  style={{ width: '100%' }}
                                  onChange={(val) => updateComboAt(idx, { quantity: Number(val) || 1 })}
                                  placeholder='Qty'
                                />
                              </Col>
                              <Col xs={8} md={4}>
                                <InputNumber
                                  min={0}
                                  value={combo.smartDineRank}
                                  style={{ width: '100%' }}
                                  onChange={(val) => updateComboAt(idx, { smartDineRank: val })}
                                  placeholder='Pref/Rank'
                                />
                              </Col>
                              <Col xs={24} md={2} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => removeComboAt(idx)}
                                />
                              </Col>
                            </Row>
                          </Card>
                        ))}
                      </>
                    )}
                  </Space>

                  <Button icon={<PlusOutlined />} onClick={addComboRow} style={{ width: '100%' }}>
                    Add combo item
                  </Button>

                  <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
                    <Button
                      onClick={() => setDraftCombos((prev) => ({ ...prev, [selectedItem._id]: baseForSelected }))}
                      disabled={!dirty || savingId === selectedItem._id || isPending}
                    >
                      Reset
                    </Button>
                    <Button
                      type='primary'
                      icon={<SaveOutlined />}
                      loading={savingId === selectedItem._id || isPending}
                      disabled={!dirty}
                      onClick={handleSave}
                    >
                      Save combos
                    </Button>
                  </Space>
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

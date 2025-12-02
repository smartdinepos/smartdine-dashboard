import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal, Button, Upload, Checkbox, Space, Typography,
  Progress, Row, Col, message, Divider
} from 'antd';
import { UploadOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import Cropper from 'react-easy-crop';

const { Text } = Typography;

// Vite env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// ---------- utils ----------
const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function createImage (src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Convert react-easy-crop *percent* crop area to pixel coords
function percentToPixels (naturalW, naturalH, areaPercent) {
  // areaPercent: { x, y, width, height } in percent (0..100)
  return {
    x: Math.round((areaPercent.x / 100) * naturalW),
    y: Math.round((areaPercent.y / 100) * naturalH),
    width: Math.round((areaPercent.width / 100) * naturalW),
    height: Math.round((areaPercent.height / 100) * naturalH)
  };
}

async function uploadFileWithVariants ({
  restaurantId,
  menuItemId,
  file,
  menuEnabled,
  promoEnabled,
  menuAreaPercent, // {x,y,width,height} in percent
  promoAreaPercent, // same
  currentSrc,
  token
}) {
  // Need natural dimensions to convert percent → pixels
  const img = await createImage(currentSrc);
  const { naturalWidth, naturalHeight } = img;

  const form = new FormData();
  form.append('file', file, file.name);

  if (menuEnabled && menuAreaPercent) {
    const m = percentToPixels(naturalWidth, naturalHeight, menuAreaPercent);
    form.append('variants[menu][x]', String(m.x));
    form.append('variants[menu][y]', String(m.y));
    form.append('variants[menu][width]', String(m.width));
    form.append('variants[menu][height]', String(m.height));
  }

  if (promoEnabled && promoAreaPercent) {
    const p = percentToPixels(naturalWidth, naturalHeight, promoAreaPercent);
    form.append('variants[promo][x]', String(p.x));
    form.append('variants[promo][y]', String(p.y));
    form.append('variants[promo][width]', String(p.width));
    form.append('variants[promo][height]', String(p.height));
  }

  const url = `${API_BASE_URL}/restaurants/${restaurantId}/menu-items/${menuItemId}/images`;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const res = await fetch(url, { method: 'POST', headers, body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed (${res.status}): ${txt}`);
  }
  // Expect { status:'success', data:{ menuItem: {...} } }
  return res.json();
}

// ---------- component ----------
export default function ManageImagesModal ({
  open,
  restaurantId,
  menuItemId,
  onClose,
  onFinished,
  token
}) {
  // Files & position
  const [files, setFiles] = useState([]); // File[]
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(null); // dataURL

  // Variant toggles
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [promoEnabled, setPromoEnabled] = useState(true);

  // Crop state (position+zoom)
  const [menuCrop, setMenuCrop] = useState({ x: 0, y: 0 }); // position
  const [menuZoom, setMenuZoom] = useState(1);
  const [menuAreaPercent, setMenuAreaPercent] = useState(null); // {x,y,w,h} in percent from onCropComplete

  const [promoCrop, setPromoCrop] = useState({ x: 0, y: 0 });
  const [promoZoom, setPromoZoom] = useState(1);
  const [promoAreaPercent, setPromoAreaPercent] = useState(null);

  // Busy/progress
  const [busy, setBusy] = useState(false);

  // Load preview when index/file changes
  useEffect(() => {
    let active = true;
    if (open && files.length) {
      readFileAsDataURL(files[currentIdx]).then((url) => {
        if (active) setCurrentSrc(url);
      });
    } else {
      setCurrentSrc(null);
    }
    return () => {
      active = false;
    };
  }, [open, files, currentIdx]);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setFiles([]);
      setCurrentIdx(0);
      setCurrentSrc(null);

      setMenuEnabled(true);
      setPromoEnabled(true);

      setMenuCrop({ x: 0, y: 0 });
      setMenuZoom(1);
      setMenuAreaPercent(null);

      setPromoCrop({ x: 0, y: 0 });
      setPromoZoom(1);
      setPromoAreaPercent(null);

      setBusy(false);
    }
  }, [open]);

  const onPickChange = ({ fileList }) => {
    const fs = fileList.map((f) => f.originFileObj).filter(Boolean);
    setFiles(fs);
    setCurrentIdx(0);
  };

  const hasWork = menuEnabled || promoEnabled;

  const handleApplyUpload = useCallback(async () => {
    if (!files.length) {
      message.warning('Select at least one image');
      return;
    }
    if (!hasWork) {
      message.warning('Enable Menu and/or Promo to upload');
      return;
    }

    try {
      setBusy(true);
      const file = files[currentIdx];

      const json = await uploadFileWithVariants({
        restaurantId,
        menuItemId,
        file,
        menuEnabled,
        promoEnabled,
        menuAreaPercent,
        promoAreaPercent,
        currentSrc,
        token
      });

      const updatedItem =
        json?.data?.menuItem || json?.menuItem || json?.data || json;

      message.success('Uploaded');

      if (currentIdx < files.length - 1) {
        setCurrentIdx(currentIdx + 1);
        setMenuCrop({ x: 0, y: 0 });
        setMenuZoom(1);
        setMenuAreaPercent(null);
        setPromoCrop({ x: 0, y: 0 });
        setPromoZoom(1);
        setPromoAreaPercent(null);
      } else {
        onFinished && onFinished(updatedItem);
      }
    } catch (e) {
      console.error(e);
      message.error(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }, [
    files,
    currentIdx,
    hasWork,
    restaurantId,
    menuItemId,
    menuEnabled,
    promoEnabled,
    menuAreaPercent,
    promoAreaPercent,
    currentSrc,
    token,
    onFinished
  ]);

  const canPrev = currentIdx > 0 && !busy;
  const canNext = currentIdx < files.length - 1 && !busy;
  const headerTitle = files[currentIdx]?.name
    ? `Edit & Upload • ${files[currentIdx].name}`
    : 'Edit & Upload';

  return (
    <Modal
      open={open}
      onCancel={() => !busy && onClose?.()}
      destroyOnClose
      width={1000}
      footer={null}
      title={headerTitle}
    >
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        <Upload
          accept='image/*'
          multiple
          beforeUpload={() => false}
          onChange={onPickChange}
          showUploadList={{ showRemoveIcon: !busy }}
          disabled={busy}
        >
          <Button icon={<UploadOutlined />} disabled={busy}>
            Select Images
          </Button>
        </Upload>

        {/* 3) Croppers */}
        {files.length > 0 && (
          <Row gutter={16}>
            {/* Menu cropper */}
            <Col span={12}>
              <div style={{ display: 'grid', gap: 8 }}>
                {/* checkbox INSIDE panel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Checkbox
                    checked={menuEnabled}
                    onChange={(e) => setMenuEnabled(e.target.checked)}
                    disabled={!files.length || busy}
                  >
                    Menu (1:1)
                  </Checkbox>
                </div>

                <div style={{ position: 'relative', width: '100%', height: 420, background: '#111', borderRadius: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      filter: menuEnabled ? 'none' : 'grayscale(1) blur(2px) opacity(0.6)',
                      pointerEvents: menuEnabled ? 'auto' : 'none'
                    }}
                  >
                    {currentSrc && (
                      <Cropper
                        image={currentSrc}
                        crop={menuCrop}
                        zoom={menuZoom}
                        aspect={1 / 1}
                        onCropChange={setMenuCrop}
                        onZoomChange={setMenuZoom}
                        onCropComplete={(area /* percent */) => setMenuAreaPercent(area)}
                        restrictPosition
                        zoomSpeed={0.8}
                        minZoom={1}
                        maxZoom={6}
                        showGrid={false}
                      />
                    )}
                  </div>

                  {!menuEnabled && (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#ccc', fontSize: 14 }}>
                      Disabled
                    </div>
                  )}
                </div>

                <input
                  type='range'
                  min={1}
                  max={6}
                  step={0.01}
                  value={menuZoom}
                  disabled={!menuEnabled || busy}
                  onChange={(e) => setMenuZoom(Number(e.target.value))}
                />
              </div>
            </Col>

            <Col span={12}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Checkbox
                    checked={promoEnabled}
                    onChange={(e) => setPromoEnabled(e.target.checked)}
                    disabled={!files.length || busy}
                  >
                    Promo (9:16)
                  </Checkbox>
                </div>

                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: 420,
                    background: '#111',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      filter: promoEnabled ? 'none' : 'grayscale(1) blur(2px) opacity(0.6)',
                      pointerEvents: promoEnabled ? 'auto' : 'none'
                    }}
                    aria-disabled={!promoEnabled}
                  >
                    {currentSrc && (
                      <Cropper
                        image={currentSrc}
                        crop={promoCrop}
                        zoom={promoZoom}
                        aspect={9 / 16}
                        onCropChange={setPromoCrop}
                        onZoomChange={setPromoZoom}
                        onCropComplete={(area) => setPromoAreaPercent(area)}
                        restrictPosition
                        zoomSpeed={0.8}
                        minZoom={1}
                        maxZoom={6}
                        showGrid={false}
                      />
                    )}
                  </div>

                  {!promoEnabled && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: '#ccc',
                        fontSize: 14
                      }}
                    >
                      Disabled
                    </div>
                  )}
                </div>

                <input
                  type='range'
                  min={1}
                  max={6}
                  step={0.01}
                  value={promoZoom}
                  disabled={!promoEnabled || busy}
                  onChange={(e) => setPromoZoom(Number(e.target.value))}
                />
              </div>
            </Col>
          </Row>
        )}

        {/* (Optional) Simple progress bar – count per-file submissions, not per-variant */}
        {files.length > 0 && (
          <div>
            <Text>
              File {files.length ? currentIdx + 1 : 0} / {files.length}
            </Text>
            <Progress
              percent={
                files.length ? Math.round(((currentIdx) / files.length) * 100) : 0
              }
            />
          </div>
        )}

        <Divider style={{ margin: '8px 0' }} />

        {/* Footer actions */}
        <Space>
          <Button
            icon={<LeftOutlined />}
            disabled={!canPrev}
            onClick={() => setCurrentIdx((i) => i - 1)}
          >
            Prev
          </Button>
          <Button
            type='primary'
            onClick={handleApplyUpload}
            loading={busy}
            disabled={!files.length || !hasWork}
          >
            Apply & Upload
          </Button>
          <Button
            icon={<RightOutlined />}
            disabled={!canNext}
            onClick={() => setCurrentIdx((i) => i + 1)}
          >
            Next
          </Button>
          <Button onClick={() => !busy && onClose?.()} disabled={busy}>
            Close
          </Button>
        </Space>
      </Space>
    </Modal>
  );
}

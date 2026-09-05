import { useEffect, useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Space,
  Button,
  Typography,
  Popconfirm,
  message,
  Tooltip,
  Checkbox,
  Tag,
  Card,
  Row,
  Col,
  Upload,
  Empty,
  Image,
  Badge,
  Spin
} from 'antd';
import {
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  DeleteOutlined,
  SaveOutlined,
  InboxOutlined,
  PlusOutlined
} from '@ant-design/icons';
import ManageImagesModal from './ManageImagesModal';
import { coerceImages, getPrimaryMenuUrl } from '../../../utils/images';
import { updateMenuItem, uploadMenuItemVideos } from '../../../api/menuItems';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

// Small helper to dedupe images by a computed key
const uniqueBy = (arr, getKey) => {
  const seen = new Set();
  return arr.filter((x) => {
    const k = getKey(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export default function MenuItemEditModal({
  open,
  item,
  onCancel,
  categoryItems,
  onItemUpdated
}) {
  const [activeTab, setActiveTab] = useState('description');
  const [currentItem, setCurrentItem] = useState(item || {});

  // Form for Description tab
  const [descriptionForm] = Form.useForm();
  const [isRecommended, setIsRecommended] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  // Images tab state
  const [manageImagesOpen, setManageImagesOpen] = useState(false);
  const [deletingImageKey, setDeletingImageKey] = useState(null);

  // Videos tab state
  const [videoFileList, setVideoFileList] = useState([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [deletingVideoKey, setDeletingVideoKey] = useState(null);

  // Sync state with incoming item
  useEffect(() => {
    if (open && item) {
      setCurrentItem(item);
      const recommended = Boolean(
        item.isRestaurantPromoted ??
        item.isRestaurantRecomended ??
        item.isRestaurantRecommended ??
        item.isRecomended ??
        false
      );
      setIsRecommended(recommended);
      descriptionForm.setFieldsValue({
        description: item.description ?? ''
      });
      setVideoFileList([]);
      setActiveTab('description');
    }
  }, [open, item, descriptionForm]);

  const restaurantId = currentItem?.restaurantId || item?.restaurantId;
  const itemId = currentItem?._id || item?._id;

  // Normalized current images and videos
  const images = coerceImages(currentItem?.images ?? []);
  const visibleImages = uniqueBy(
    images.filter(im => im && (im.type === 'menu' || im.type === 'promo' || im.type === 'original' || im.url)),
    im => `${im.type || 'img'}:${im.id || im.url}`
  );
  const primaryUrl = getPrimaryMenuUrl(images);

  const videos = Array.isArray(currentItem?.videos) ? currentItem.videos : [];

  // ==========================================
  // TAB 1: DESCRIPTION (Updated independently)
  // ==========================================
  const handleSaveDescription = async () => {
    try {
      const values = await descriptionForm.validateFields();
      setSavingDescription(true);

      const payload = {
        description: values.description?.trim() ?? '',
        isRestaurantRecommended: Boolean(isRecommended),
        isRestaurantRecomended: Boolean(isRecommended)
      };

      const updated = await updateMenuItem(restaurantId, itemId, payload);
      message.success('Description updated successfully');

      const merged = { ...currentItem, ...updated, description: payload.description, isRestaurantRecommended: payload.isRestaurantRecommended };
      setCurrentItem(merged);
      onItemUpdated?.(merged);
    } catch (e) {
      if (e?.errorFields) return; // Antd form validation error
      message.error(e?.response?.data?.message || e?.message || 'Failed to update description');
    } finally {
      setSavingDescription(false);
    }
  };

  // ==========================================
  // TAB 2: IMAGES (Updated independently)
  // ==========================================
  const handleRemoveImage = async (target) => {
    const targetKey = target.id || target.url;
    try {
      setDeletingImageKey(targetKey);
      const remaining = images.filter(x => (x.id || x.url) !== targetKey).map(({ id, type, url }) => ({
        id, type, url
      }));

      const updated = await updateMenuItem(restaurantId, itemId, { images: remaining });
      message.success('Image removed');

      const merged = { ...currentItem, ...updated, images: remaining };
      setCurrentItem(merged);
      onItemUpdated?.(merged);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || 'Failed to remove image');
    } finally {
      setDeletingImageKey(null);
    }
  };

  const handleImagesFinished = (updatedItem) => {
    if (updatedItem?.images) {
      const merged = { ...currentItem, ...updatedItem, images: updatedItem.images };
      setCurrentItem(merged);
      onItemUpdated?.(merged);
      message.success('Images updated successfully');
    }
    setManageImagesOpen(false);
  };

  // ==========================================
  // TAB 3: VIDEOS (Updated independently)
  // ==========================================
  const handleUploadVideo = async () => {
    if (!videoFileList.length) {
      message.warning('Please select a video file first');
      return;
    }

    const file = videoFileList[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'promo');

    try {
      setUploadingVideo(true);
      const updated = await uploadMenuItemVideos(restaurantId, itemId, formData);
      message.success('Video uploaded successfully!');

      setVideoFileList([]);
      const merged = { ...currentItem, ...updated };
      setCurrentItem(merged);
      onItemUpdated?.(merged);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || 'Failed to upload video');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleRemoveVideo = async (target) => {
    const targetKey = target.id || target.url;
    try {
      setDeletingVideoKey(targetKey);
      const remaining = videos.filter(v => (v.id || v.url) !== targetKey).map(({ id, type, url }) => ({
        id, type, url
      }));

      const updated = await updateMenuItem(restaurantId, itemId, { videos: remaining });
      message.success('Video removed');

      const merged = { ...currentItem, ...updated, videos: remaining };
      setCurrentItem(merged);
      onItemUpdated?.(merged);
    } catch (e) {
      message.error(e?.response?.data?.message || e?.message || 'Failed to remove video');
    } finally {
      setDeletingVideoKey(null);
    }
  };

  // Tab items config
  const tabItems = [
    {
      key: 'description',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 6 }} />
          Description
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          {/* Recommendation Checkbox Banner */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              background: isRecommended ? '#f6ffed' : '#fafafa',
              border: `1px solid ${isRecommended ? '#b7eb8f' : '#f0f0f0'}`,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <Text strong style={{ display: 'block', fontSize: 14 }}>
                Recommend this dish
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Promoted dishes appear at the top of the menu to capture customer attention (max 2 per category).
              </Text>
            </div>
            <Checkbox
              checked={isRecommended}
              onChange={(e) => {
                const checked = e.target.checked;
                if (checked) {
                  const currentId = currentItem?._id || item?._id;
                  const promotedCount = (categoryItems || []).filter(i =>
                    (i._id !== currentId) &&
                    (i.isRestaurantPromoted || i.isRestaurantRecomended || i.isRestaurantRecommended || i.isRecomended)
                  ).length;

                  if (promotedCount >= 2) {
                    message.warning("Can't promote more than 2 items in this category. Unselect an existing one first.");
                    return;
                  }
                }
                setIsRecommended(checked);
              }}
            >
              Recommend
            </Checkbox>
          </div>

          {/* Description Form */}
          <Form form={descriptionForm} layout="vertical">
            <Form.Item
              label={<Text strong>Dish Description</Text>}
              name="description"
              extra="Provide an appetizing summary of ingredients, culinary style, dietary notes, or flavor profile."
            >
              <Input.TextArea
                autoSize={{ minRows: 4, maxRows: 8 }}
                placeholder="E.g., Tender cubes of fresh cottage cheese tossed with bell peppers and roasted ground spices in a rich, buttery gravy."
                showCount
                maxLength={500}
              />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingDescription}
                onClick={handleSaveDescription}
              >
                Save Description
              </Button>
            </div>
          </Form>
        </div>
      )
    },
    {
      key: 'images',
      label: (
        <span>
          <PictureOutlined style={{ marginRight: 6 }} />
          Images
          <Badge
            count={visibleImages.length}
            style={{ marginLeft: 8, backgroundColor: visibleImages.length > 0 ? '#1890ff' : '#d9d9d9' }}
          />
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          {/* Header info & Manage action */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <Text strong style={{ display: 'block', fontSize: 14 }}>
                Menu & Promotional Images
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Square (1:1) crops are used on the menu card, while vertical (9:16) crops are featured in dish spotlights.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setManageImagesOpen(true)}
            >
              Manage & Upload Images
            </Button>
          </div>

          {/* Primary Menu Thumbnail Preview */}
          <div
            style={{
              background: '#fafafa',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              padding: 12,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#eee',
                flexShrink: 0,
                display: 'grid',
                placeItems: 'center'
              }}
            >
              {primaryUrl ? (
                <Image
                  src={primaryUrl}
                  alt="primary thumbnail"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  preview={{ mask: 'View' }}
                />
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>No Image</Text>
              )}
            </div>
            <div>
              <Tag color="blue">Display Image (Menu 1:1)</Tag>
              <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {primaryUrl
                  ? 'This is the primary square image shown to guests on the digital menu.'
                  : 'Click "Manage & Upload Images" to crop and set a primary menu photo.'}
              </Paragraph>
            </div>
          </div>

          {/* Current Images Grid */}
          <div style={{ marginTop: 12 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Active Variants ({visibleImages.length})
            </Text>

            {visibleImages.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No images uploaded yet. Click 'Manage & Upload Images' to add dish photos."
              />
            ) : (
              <Row gutter={[12, 12]}>
                {visibleImages.map((im) => {
                  const key = im.id || im.url;
                  const isMenu = im.type === 'menu';
                  const isPromo = im.type === 'promo';
                  const isDeleting = deletingImageKey === key;

                  return (
                    <Col xs={12} sm={8} md={6} key={key}>
                      <Card
                        hoverable
                        size="small"
                        styles={{ body: { padding: 8 } }}
                        style={{ borderRadius: 8, overflow: 'hidden' }}
                        cover={
                          <div style={{ height: 110, overflow: 'hidden', background: '#f5f5f5', position: 'relative' }}>
                            <Image
                              src={im.url}
                              alt={im.type}
                              style={{ width: '100%', height: 110, objectFit: 'cover' }}
                            />
                            <div style={{ position: 'absolute', top: 6, left: 6 }}>
                              <Tag
                                color={isMenu ? 'blue' : isPromo ? 'purple' : 'cyan'}
                                style={{ margin: 0, textTransform: 'capitalize', fontSize: 11 }}
                              >
                                {im.type}
                              </Tag>
                            </div>
                          </div>
                        }
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text type="secondary" ellipsis style={{ fontSize: 11, maxWidth: 100 }}>
                            {im.type === 'menu' ? '1:1 Square' : im.type === 'promo' ? '9:16 Vertical' : 'Original'}
                          </Text>
                          <Popconfirm
                            title="Remove image?"
                            description="This image variant will be removed from this item."
                            onConfirm={() => handleRemoveImage(im)}
                            okText="Remove"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={isDeleting ? <Spin size="small" /> : <DeleteOutlined />}
                              disabled={isDeleting}
                            />
                          </Popconfirm>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'videos',
      label: (
        <span>
          <VideoCameraOutlined style={{ marginRight: 6 }} />
          Videos
          <Badge
            count={videos.length}
            style={{ marginLeft: 8, backgroundColor: videos.length > 0 ? '#722ed1' : '#d9d9d9' }}
          />
        </span>
      ),
      children: (
        <div style={{ paddingTop: 8 }}>
          {/* Video Description Header */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', fontSize: 14 }}>
              Promotional Videos
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Upload short promo videos (MP4, WebM, MOV, MKV up to 50MB) to showcase dish preparation, sizzling sounds, or plating.
            </Text>
          </div>

          {/* Video Upload Dropzone */}
          <Card size="small" style={{ borderRadius: 8, marginBottom: 20, background: '#fafafa' }}>
            <Dragger
              accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
              maxCount={1}
              fileList={videoFileList}
              beforeUpload={(file) => {
                const isLt50M = file.size / 1024 / 1024 < 50;
                if (!isLt50M) {
                  message.error('Video size must be less than 50MB');
                  return Upload.LIST_IGNORE;
                }
                setVideoFileList([file]);
                return false;
              }}
              onRemove={() => setVideoFileList([])}
              disabled={uploadingVideo}
              style={{ padding: '16px 0' }}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#722ed1', fontSize: 32 }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 14 }}>
                Click or drag video to this area to upload
              </p>
              <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                Supports MP4, WebM, MOV, MKV format (max 50MB). Uploaded as <b>Promo</b> video.
              </p>
            </Dragger>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <Button
                type="primary"
                icon={<UploadOutlined />}
                loading={uploadingVideo}
                disabled={!videoFileList.length}
                onClick={handleUploadVideo}
                style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
              >
                Upload Video
              </Button>
            </div>
          </Card>

          {/* Current Videos List */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Uploaded Videos ({videos.length})
            </Text>

            {videos.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No promotional videos uploaded yet for this dish."
              />
            ) : (
              <Row gutter={[16, 16]}>
                {videos.map((v) => {
                  const key = v.id || v.url;
                  const isDeleting = deletingVideoKey === key;

                  return (
                    <Col xs={24} sm={12} key={key}>
                      <Card
                        size="small"
                        style={{ borderRadius: 8, overflow: 'hidden' }}
                        styles={{ body: { padding: 12 } }}
                      >
                        <div style={{ width: '100%', height: 180, borderRadius: 6, overflow: 'hidden', background: '#000', marginBottom: 8 }}>
                          <video
                            src={v.url}
                            controls
                            preload="metadata"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Space size="small">
                            <Tag color="purple" style={{ margin: 0, textTransform: 'capitalize' }}>
                              {v.type || 'promo'}
                            </Tag>
                            <Text type="secondary" ellipsis style={{ maxWidth: 160, fontSize: 12 }}>
                              {v.id || 'Video Asset'}
                            </Text>
                          </Space>

                          <Popconfirm
                            title="Remove video?"
                            description="Are you sure you want to remove this video from this menu item?"
                            onConfirm={() => handleRemoveVideo(v)}
                            okText="Remove"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                          >
                            <Button
                              type="text"
                              danger
                              size="small"
                              icon={isDeleting ? <Spin size="small" /> : <DeleteOutlined />}
                              disabled={isDeleting}
                            >
                              Remove
                            </Button>
                          </Popconfirm>
                        </div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
            <Space size="middle">
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {item?.name ? `Edit · ${item.name}` : 'Edit Menu Item'}
              </span>
              {item?.category && (
                <Tag color="default" style={{ borderRadius: 12 }}>
                  {item.category}
                </Tag>
              )}
            </Space>
            {typeof item?.price === 'number' && (
              <Text strong style={{ color: '#52c41a' }}>
                ₹{item.price.toFixed(2)}
              </Text>
            )}
          </div>
        }
        open={open}
        onCancel={onCancel}
        footer={[
          <Button key="close" type="default" onClick={onCancel}>
            Close
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ minHeight: 380 }}
        />
      </Modal>

      {/* Cropping and variant generation modal */}
      <ManageImagesModal
        open={manageImagesOpen}
        restaurantId={restaurantId}
        menuItemId={itemId}
        onClose={() => setManageImagesOpen(false)}
        onFinished={handleImagesFinished}
      />
    </>
  );
}

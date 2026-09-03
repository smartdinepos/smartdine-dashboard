# SmartDine Dashboard — API Documentation

This document provides comprehensive specification and reference for all REST API endpoints, complete with request parameters, headers, payloads, and response examples.

---

## Table of Contents
1. [Overview & Configuration](#1-overview--configuration)
2. [Authentication & Headers](#2-authentication--headers)
3. [Summary of API Endpoints](#3-summary-of-api-endpoints)
4. [Endpoint Details](#4-endpoint-details)
   - [4.1. Restaurants](#41-restaurants)
     - [Fetch Restaurants](#fetch-restaurants)
   - [4.2. Categories](#42-categories)
     - [1. Fetch Categories](#1-fetch-categories)
     - [2. Create Category](#2-create-category)
     - [3. Update Category](#3-update-category)
     - [4. Delete Category](#4-delete-category)
   - [4.3. Category Groups](#43-category-groups)
     - [1. Fetch Category Groups](#1-fetch-category-groups)
     - [2. Create Category Group](#2-create-category-group)
     - [3. Update Category Group](#3-update-category-group)
     - [4. Delete Category Group](#4-delete-category-group)
   - [4.4. Menu Items](#44-menu-items)
     - [1. Fetch Menu Items](#1-fetch-menu-items)
     - [2. Update Menu Item](#2-update-menu-item)
     - [3. Upload Menu Item Image & Crop Variants](#3-upload-menu-item-image--crop-variants)
5. [Error Handling & Status Codes](#5-error-handling--status-codes)

---

## 1. Overview & Configuration

### Base URL
- **Production Base URL**: `https://api.smartdine.xyz`
- **Protocol**: HTTPS
- **Data Format**: JSON (`application/json`) / Multipart Form Data (`multipart/form-data`)

---

## 2. Authentication & Headers

Requests are authenticated using a JSON Web Token (JWT) sent in the HTTP `Authorization` header.

### Standard Request Headers
| Header | Value | Description |
| :--- | :--- | :--- |
| `Authorization` | `Bearer <ACCESS_TOKEN>` | Bearer token for user authentication |
| `Content-Type` | `application/json` | Content type for JSON payloads |
| `Content-Type` | `multipart/form-data` | Used for file/image uploads |
| `Accept` | `application/json` | Expected response content format |

---

## 3. Summary of API Endpoints

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Restaurants** | `GET` | `/restaurants` | Fetch all accessible restaurants |
| **Categories** | `GET` | `/restaurants/:restaurantId/categories` | List all categories for a restaurant |
| **Categories** | `POST` | `/restaurants/:restaurantId/categories` | Create a new category |
| **Categories** | `PATCH` | `/restaurants/:restaurantId/categories/:categoryId` | Update a category |
| **Categories** | `DELETE` | `/restaurants/:restaurantId/categories/:categoryId` | Delete a category |
| **Category Groups** | `GET` | `/restaurants/:restaurantId/category-groups` | List category groups |
| **Category Groups** | `POST` | `/restaurants/:restaurantId/category-groups` | Create a category group |
| **Category Groups** | `PATCH` | `/restaurants/:restaurantId/category-groups/:categoryGroupId` | Update a category group |
| **Category Groups** | `DELETE` | `/restaurants/:restaurantId/category-groups/:categoryGroupId` | Delete a category group |
| **Menu Items** | `GET` | `/restaurants/:restaurantId/menu-items` | Fetch all menu items |
| **Menu Items** | `PATCH` | `/restaurants/:restaurantId/menu-items/:itemId` | Update menu item details |
| **Menu Items** | `POST` | `/restaurants/:restaurantId/menu-items/:itemId/images` | Upload image & crop variants |

---

## 4. Endpoint Details

### 4.1. Restaurants

#### Fetch Restaurants
Retrieves the list of restaurants accessible to the authenticated manager account.

- **Method**: `GET`
- **Endpoint**: `/restaurants`

##### HTTP Request
```http
GET /restaurants HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "_id": "60c72b2f9b1d8b001c8e4d21",
        "name": "SmartDine Bistro",
        "status": "active",
        "description": "Fine dining restaurant with rooftop seating"
      },
      {
        "_id": "60c72b2f9b1d8b001c8e4d22",
        "name": "SmartDine Express",
        "status": "active",
        "description": "Fast casual quick-service cafe"
      }
    ]
  }
}
```

---

### 4.2. Categories

#### 1. Fetch Categories
Lists all categories (both parent categories and child categories) configured for a specific restaurant.

- **Method**: `GET`
- **Endpoint**: `/restaurants/:restaurantId/categories`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |

##### HTTP Request
```http
GET /restaurants/60c72b2f9b1d8b001c8e4d21/categories HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "categories": [
      {
        "_id": "60c72b2f9b1d8b001c8e4d2a",
        "name": "Starters",
        "type": "child",
        "displayOrder": 1,
        "categoryGroupId": "60c72b2f9b1d8b001c8e4d30",
        "restaurantId": "60c72b2f9b1d8b001c8e4d21"
      },
      {
        "_id": "60c72b2f9b1d8b001c8e4d2b",
        "name": "Beverages",
        "type": "child",
        "displayOrder": 2,
        "categoryGroupId": null,
        "restaurantId": "60c72b2f9b1d8b001c8e4d21"
      }
    ]
  }
}
```

---

#### 2. Create Category
Creates a new menu category for the specified restaurant.

- **Method**: `POST`
- **Endpoint**: `/restaurants/:restaurantId/categories`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |

##### Request Body Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Category display name |
| `type` | String | No | Hierarchy type: `"child"` or `"parent"` (default: `"child"`) |
| `displayOrder` | Number / null | No | Sort order in menu displays (lower numbers appear first) |

##### HTTP Request
```http
POST /restaurants/60c72b2f9b1d8b001c8e4d21/categories HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json

{
  "name": "Beverages",
  "type": "child",
  "displayOrder": 2
}
```

##### HTTP Response
```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "category": {
      "_id": "60c72b2f9b1d8b001c8e4d2b",
      "name": "Beverages",
      "type": "child",
      "displayOrder": 2,
      "restaurantId": "60c72b2f9b1d8b001c8e4d21"
    }
  }
}
```

---

#### 3. Update Category
Updates an existing menu category's name, display order, or associated category group.

> [!NOTE]
> The category `type` field is immutable after creation and cannot be updated.

- **Method**: `PATCH`
- **Endpoint**: `/restaurants/:restaurantId/categories/:categoryId`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |
| `categoryId` | String | Yes | MongoDB ObjectId of the category to update |

##### Request Body Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | No | Updated category name |
| `displayOrder` | Number / null | No | Updated sort order |
| `categoryGroupId` | String / null | No | ID of associated category group (or `null` to unassign) |

##### HTTP Request
```http
PATCH /restaurants/60c72b2f9b1d8b001c8e4d21/categories/60c72b2f9b1d8b001c8e4d2b HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json

{
  "name": "Signature Drinks",
  "displayOrder": 1,
  "categoryGroupId": "60c72b2f9b1d8b001c8e4d30"
}
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "category": {
      "_id": "60c72b2f9b1d8b001c8e4d2b",
      "name": "Signature Drinks",
      "displayOrder": 1,
      "categoryGroupId": "60c72b2f9b1d8b001c8e4d30"
    }
  }
}
```

---

#### 4. Delete Category
Deletes a menu category from the restaurant.

- **Method**: `DELETE`
- **Endpoint**: `/restaurants/:restaurantId/categories/:categoryId`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |
| `categoryId` | String | Yes | MongoDB ObjectId of the category to delete |

##### HTTP Request
```http
DELETE /restaurants/60c72b2f9b1d8b001c8e4d21/categories/60c72b2f9b1d8b001c8e4d2b HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "message": "Category deleted successfully"
}
```

---

### 4.3. Category Groups

Category groups represent logical groupings of categories used for ordering flow, promotions, and rule-based cross-category upselling.

#### 1. Fetch Category Groups
Lists all category groups configured for a restaurant.

- **Method**: `GET`
- **Endpoint**: `/restaurants/:restaurantId/category-groups`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |

##### HTTP Request
```http
GET /restaurants/60c72b2f9b1d8b001c8e4d21/category-groups HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "categoryGroups": [
      {
        "_id": "60c72b2f9b1d8b001c8e4d30",
        "name": "Appetizers & Starters",
        "isCurrentCategoryGroupEligible": true,
        "maxItemsPerGuest": 2,
        "linkedCategoryGroups": [
          {
            "triggerEvent": "ON_CATEGORY_GROUP_START",
            "targetCategoryGroupId": "60c72b2f9b1d8b001c8e4d31",
            "maxPromotions": 1
          }
        ]
      }
    ]
  }
}
```

---

#### 2. Create Category Group
Creates a new category group with promotion eligibility, guest item limits, and linked category group rules.

- **Method**: `POST`
- **Endpoint**: `/restaurants/:restaurantId/category-groups`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |

##### Request Body Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Name of the category group |
| `isCurrentCategoryGroupEligible` | Boolean | No | Whether the group is eligible for promotions (default: `true`) |
| `maxItemsPerGuest` | Number / null | No | Maximum allowed items per guest |
| `linkedCategoryGroups` | Array | No | Array of transition/upsell rules triggered on events |

##### Supported Trigger Events
- `ON_CATEGORY_GROUP_START`
- `ON_CATEGORY_GROUP_END`
- `WHILE_CATEGORY_GROUP_ACTIVE`

##### HTTP Request
```http
POST /restaurants/60c72b2f9b1d8b001c8e4d21/category-groups HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json

{
  "name": "Main Courses",
  "isCurrentCategoryGroupEligible": true,
  "maxItemsPerGuest": 3,
  "linkedCategoryGroups": [
    {
      "triggerEvent": "ON_CATEGORY_GROUP_END",
      "targetCategoryGroupId": "60c72b2f9b1d8b001c8e4d32",
      "maxPromotions": 1
    }
  ]
}
```

##### HTTP Response
```http
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "categoryGroup": {
      "_id": "60c72b2f9b1d8b001c8e4d31",
      "name": "Main Courses",
      "isCurrentCategoryGroupEligible": true,
      "maxItemsPerGuest": 3,
      "linkedCategoryGroups": [
        {
          "triggerEvent": "ON_CATEGORY_GROUP_END",
          "targetCategoryGroupId": "60c72b2f9b1d8b001c8e4d32",
          "maxPromotions": 1
        }
      ]
    }
  }
}
```

---

#### 3. Update Category Group
Updates properties of an existing category group.

- **Method**: `PATCH`
- **Endpoint**: `/restaurants/:restaurantId/category-groups/:categoryGroupId`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |
| `categoryGroupId` | String | Yes | MongoDB ObjectId of the category group |

##### Request Body Fields
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | No | Updated category group name |
| `isCurrentCategoryGroupEligible` | Boolean | No | Updated promotion eligibility |
| `maxItemsPerGuest` | Number / null | No | Updated maximum items allowed per guest |
| `linkedCategoryGroups` | Array | No | Updated linked category group transition rules |

##### HTTP Request
```http
PATCH /restaurants/60c72b2f9b1d8b001c8e4d21/category-groups/60c72b2f9b1d8b001c8e4d31 HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json

{
  "name": "Main Courses & Chef Specials",
  "isCurrentCategoryGroupEligible": true,
  "maxItemsPerGuest": 4,
  "linkedCategoryGroups": [
    {
      "triggerEvent": "ON_CATEGORY_GROUP_END",
      "targetCategoryGroupId": "60c72b2f9b1d8b001c8e4d32",
      "maxPromotions": 2
    }
  ]
}
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "categoryGroup": {
      "_id": "60c72b2f9b1d8b001c8e4d31",
      "name": "Main Courses & Chef Specials",
      "isCurrentCategoryGroupEligible": true,
      "maxItemsPerGuest": 4,
      "linkedCategoryGroups": [
        {
          "triggerEvent": "ON_CATEGORY_GROUP_END",
          "targetCategoryGroupId": "60c72b2f9b1d8b001c8e4d32",
          "maxPromotions": 2
        }
      ]
    }
  }
}
```

---

#### 4. Delete Category Group
Deletes a category group from the restaurant.

- **Method**: `DELETE`
- **Endpoint**: `/restaurants/:restaurantId/category-groups/:categoryGroupId`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |
| `categoryGroupId` | String | Yes | MongoDB ObjectId of the category group to delete |

##### HTTP Request
```http
DELETE /restaurants/60c72b2f9b1d8b001c8e4d21/category-groups/60c72b2f9b1d8b001c8e4d31 HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "message": "Category group deleted successfully"
}
```

---

### 4.4. Menu Items

#### 1. Fetch Menu Items
Fetches all menu items for the specified restaurant.

- **Method**: `GET`
- **Endpoint**: `/restaurants/:restaurantId/menu-items`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |

##### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `categoryId` | String | No | Filter items belonging to a specific category ObjectId |
| `status` | String | No | Filter by item status (e.g. `active`, `inactive`) |

##### HTTP Request (Example with Query Parameters)
```http
GET /restaurants/60c72b2f9b1d8b001c8e4d21/menu-items?categoryId=60c72b2f9b1d8b001c8e4d2a&status=active HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "menuItems": [
      {
        "_id": "60c72b2f9b1d8b001c8e4d40",
        "name": "Paneer Tikka",
        "description": "Tandoor grilled cottage cheese cubes marinated in spices",
        "price": 280,
        "tags": [
          "Veg",
          "Bestseller"
        ],
        "images": [
          {
            "id": "img_01",
            "type": "menu",
            "url": "https://assets.smartdine.xyz/images/paneer-tikka-menu.jpg"
          },
          {
            "id": "img_02",
            "type": "promo",
            "url": "https://assets.smartdine.xyz/images/paneer-tikka-promo.jpg"
          }
        ],
        "categoryId": "60c72b2f9b1d8b001c8e4d2a",
        "categoryName": "Starters",
        "menuName": "Dinner Menu",
        "posCategoryId": "POS_CAT_10",
        "posItemId": "POS_ITEM_1001",
        "status": "active",
        "displayOrder": 1,
        "isRestaurantRecommended": true,
        "comboItems": [
          {
            "id": "60c72b2f9b1d8b001c8e4d45",
            "quantity": 1,
            "smartDineRank": 1
          }
        ]
      }
    ]
  }
}
```

---

#### 2. Update Menu Item
Updates details and configurations for a menu item (such as promotional recommendation flags, description, category assignment, upsell combo pairings, or active images).

- **Method**: `PATCH`
- **Endpoint**: `/restaurants/:restaurantId/menu-items/:itemId`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |
| `itemId` | String | Yes | MongoDB ObjectId of the menu item |

##### Request Body Fields (`application/json`)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `description` | String | No | Updated description text |
| `isRestaurantRecommended` | Boolean | No | Whether the restaurant promotes this item (max 2 per category) |
| `categoryId` | String | No | Category ObjectId assignment |
| `comboItems` | Array | No | Upsell combo items: `[{ id: String, quantity: Number, smartDineRank: Number }]` |
| `images` | Array | No | Active image variant references: `[{ id: String, type: String, url: String }]` |

##### HTTP Request
```http
PATCH /restaurants/60c72b2f9b1d8b001c8e4d21/menu-items/60c72b2f9b1d8b001c8e4d40 HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json

{
  "description": "Updated gourmet paneer tikka served with mint chutney",
  "isRestaurantRecommended": true,
  "categoryId": "60c72b2f9b1d8b001c8e4d2a",
  "comboItems": [
    {
      "id": "60c72b2f9b1d8b001c8e4d45",
      "quantity": 1,
      "smartDineRank": 1
    },
    {
      "id": "60c72b2f9b1d8b001c8e4d46",
      "quantity": 1,
      "smartDineRank": 2
    }
  ],
  "images": [
    {
      "id": "img_01",
      "type": "menu",
      "url": "https://assets.smartdine.xyz/images/paneer-tikka-menu.jpg"
    }
  ]
}
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "menuItem": {
      "_id": "60c72b2f9b1d8b001c8e4d40",
      "name": "Paneer Tikka",
      "description": "Updated gourmet paneer tikka served with mint chutney",
      "price": 280,
      "tags": [
        "Veg",
        "Bestseller"
      ],
      "images": [
        {
          "id": "img_01",
          "type": "menu",
          "url": "https://assets.smartdine.xyz/images/paneer-tikka-menu.jpg"
        }
      ],
      "categoryId": "60c72b2f9b1d8b001c8e4d2a",
      "categoryName": "Starters",
      "menuName": "Dinner Menu",
      "posCategoryId": "POS_CAT_10",
      "posItemId": "POS_ITEM_1001",
      "status": "active",
      "displayOrder": 1,
      "isRestaurantRecommended": true,
      "comboItems": [
        {
          "id": "60c72b2f9b1d8b001c8e4d45",
          "quantity": 1,
          "smartDineRank": 1
        },
        {
          "id": "60c72b2f9b1d8b001c8e4d46",
          "quantity": 1,
          "smartDineRank": 2
        }
      ]
    }
  }
}
```

---

#### 3. Upload Menu Item Image & Crop Variants
Uploads a raw image file and submits pixel-level cropping coordinates to generate `menu` (1:1 aspect ratio) and `promo` (9:16 aspect ratio) image variants.

- **Method**: `POST`
- **Endpoint**: `/restaurants/:restaurantId/menu-items/:itemId/images`
- **Content Type**: `multipart/form-data`

##### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `restaurantId` | String | Yes | MongoDB ObjectId of the restaurant |
| `itemId` | String | Yes | MongoDB ObjectId of the menu item |

##### Form Data Fields (`multipart/form-data`)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | File (binary) | Yes | Raw image file binary (JPEG/PNG, max 10MB) |
| `variants[menu][x]` | Number | If menu enabled | X pixel coordinate for 1:1 square crop |
| `variants[menu][y]` | Number | If menu enabled | Y pixel coordinate for 1:1 square crop |
| `variants[menu][width]` | Number | If menu enabled | Width in pixels for 1:1 square crop |
| `variants[menu][height]` | Number | If menu enabled | Height in pixels for 1:1 square crop |
| `variants[promo][x]` | Number | If promo enabled | X pixel coordinate for 9:16 vertical promo crop |
| `variants[promo][y]` | Number | If promo enabled | Y pixel coordinate for 9:16 vertical promo crop |
| `variants[promo][width]` | Number | If promo enabled | Width in pixels for 9:16 vertical promo crop |
| `variants[promo][height]` | Number | If promo enabled | Height in pixels for 9:16 vertical promo crop |

##### HTTP Request
```http
POST /restaurants/60c72b2f9b1d8b001c8e4d21/menu-items/60c72b2f9b1d8b001c8e4d40/images HTTP/1.1
Host: api.smartdine.xyz
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
Accept: application/json

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[menu][x]"

0
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[menu][y]"

0
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[menu][width]"

400
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[menu][height]"

400
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[promo][x]"

50
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[promo][y]"

100
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[promo][width]"

800
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="variants[promo][height]"

1000
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="file"; filename="paneer-tikka-raw.jpg"
Content-Type: image/jpeg

<binary image data>
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

##### HTTP Response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{
  "status": "success",
  "data": {
    "menuItem": {
      "_id": "60c72b2f9b1d8b001c8e4d40",
      "name": "Paneer Tikka",
      "images": [
        {
          "id": "variant_menu_101",
          "type": "menu",
          "url": "https://assets.smartdine.xyz/uploads/menu-crop-101.jpg"
        },
        {
          "id": "variant_promo_102",
          "type": "promo",
          "url": "https://assets.smartdine.xyz/uploads/promo-crop-102.jpg"
        }
      ]
    }
  }
}
```

---

## 5. Error Handling & Status Codes

Standard HTTP status codes and error formats returned by the SmartDine API:

### Status Code Reference Table
| Status Code | Meaning | Description |
| :--- | :--- | :--- |
| `200 OK` | Success | Request succeeded and response contains payload |
| `201 Created` | Resource Created | New entity was created successfully |
| `400 Bad Request` | Validation Error | Missing parameters, invalid IDs, or invalid payload structure |
| `401 Unauthorized` | Authentication Failed | Invalid, missing, or expired Bearer token |
| `403 Forbidden` | Access Denied | Insufficient permissions for the requested restaurant resource |
| `404 Not Found` | Resource Not Found | Restaurant, Category, Category Group, or Menu Item ID does not exist |
| `500 Internal Server Error` | Server Error | An unexpected server error occurred |

---

### Standard Error HTTP Responses

#### 1. 400 Bad Request
Occurs when payload validation fails or required fields are missing.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json; charset=utf-8

{
  "status": "error",
  "message": "Category name is required"
}
```

#### 2. 401 Unauthorized
Occurs when the `Authorization` header is missing, malformed, or the JWT token is expired.

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json; charset=utf-8

{
  "status": "error",
  "message": "Invalid or expired authentication token"
}
```

#### 3. 403 Forbidden
Occurs when the authenticated user does not have permission to access or modify resources belonging to the specified restaurant.

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json; charset=utf-8

{
  "status": "error",
  "message": "You do not have permission to manage this restaurant"
}
```

#### 4. 404 Not Found
Occurs when a resource specified by a path parameter (such as `restaurantId`, `categoryId`, `categoryGroupId`, or `itemId`) does not exist.

```http
HTTP/1.1 404 Not Found
Content-Type: application/json; charset=utf-8

{
  "status": "error",
  "message": "Menu item not found"
}
```

#### 5. 500 Internal Server Error
Occurs when an unhandled server-side exception or downstream database error occurs.

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{
  "status": "error",
  "message": "An unexpected internal server error occurred"
}
```

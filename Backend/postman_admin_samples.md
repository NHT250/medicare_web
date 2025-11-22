# Medicare Admin API – Sample Postman Requests

Use these examples to exercise the new admin endpoints. Replace the placeholder values (e.g. `<JWT_TOKEN>`, `<PRODUCT_ID>`) with real data.

## 1. Login (retrieve admin token)
```
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "admin@medicare.com",
  "password": "Admin@123",
  "recaptcha_token": "testing-token"
}
```

Expected response:
```
{
  "message": "Login successful",
  "token": "<JWT_TOKEN>",
  "role": "admin",
  "name": "Admin User",
  "email": "admin@medicare.com",
  "user": { ... }
}
```

Store `token` as a Postman variable (e.g. `{{jwtToken}}`).

## 2. List products (admin)
```
GET {{baseUrl}}/api/admin/products?page=1&per_page=20
Authorization: Bearer {{jwtToken}}
```

## 3. Create a product
```
POST {{baseUrl}}/api/admin/products
Authorization: Bearer {{jwtToken}}
Content-Type: application/json

{
  "name": "Sample Medicine",
  "description": "Short description",
  "price": 19.99,
  "image": "https://example.com/image.jpg",
  "category": "supplements",
  "stock": 50,
  "inStock": true
}
```

## 4. Update a product
```
PUT {{baseUrl}}/api/admin/products/<PRODUCT_ID>
Authorization: Bearer {{jwtToken}}
Content-Type: application/json

{
  "price": 17.99,
  "stock": 80
}
```

## 5. Delete a product
```
DELETE {{baseUrl}}/api/admin/products/<PRODUCT_ID>
Authorization: Bearer {{jwtToken}}
```

## 6. List orders & update status
```
GET {{baseUrl}}/api/admin/orders
Authorization: Bearer {{jwtToken}}
```

```
PUT {{baseUrl}}/api/admin/orders/<ORDER_ID>
Authorization: Bearer {{jwtToken}}
Content-Type: application/json

{
  "status": "confirmed"
}
```

## 7. List users & ban/unban
```
GET {{baseUrl}}/api/admin/users?search=john
Authorization: Bearer {{jwtToken}}
```

```
PATCH {{baseUrl}}/api/admin/users/<USER_ID>
Authorization: Bearer {{jwtToken}}
Content-Type: application/json

{
  "action": "ban"
}
```

## 8. Dashboard summary
```
GET {{baseUrl}}/api/admin/dashboard
Authorization: Bearer {{jwtToken}}
```

These samples can be copied into a Postman collection and adjusted to match your environment.

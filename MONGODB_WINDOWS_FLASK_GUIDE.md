# Complete Windows Guide: MongoDB + Flask (PyMongo)

## 1️⃣ Introduction
MongoDB is a NoSQL, document-based database that stores data in flexible JSON-like documents (BSON). Instead of fixed tables and columns, each document can evolve as your application changes, making it ideal for rapidly iterating features. For Flask web projects, MongoDB pairs well because both emphasize agility: Flask offers lightweight routing and MongoDB lets you persist nested objects without schema migrations.

## 2️⃣ Installing MongoDB on Windows
1. **Download MongoDB Community Edition**
   - Visit the official download page: <https://www.mongodb.com/try/download/community>.
   - Choose **Current Release**, select **Windows x64**, and download the `.msi` installer.
2. **Run the Installer**
   - Double-click the `.msi` file.
   - Accept the license and choose **Complete** when prompted for the setup type.
   - Tick **Install MongoDB as a Service** so MongoDB runs automatically in the background.
   - Optionally install MongoDB Compass (GUI) if you want a visual tool.
3. **Verify the Windows Service** (PowerShell or Command Prompt as Administrator):
   ```powershell
   net start MongoDB
   ```
   If the service is already running, Windows reports it. Otherwise, the command starts it.
4. **Confirm the MongoDB Version**:
   ```powershell
   mongod --version
   ```
   Seeing version details confirms the binaries are accessible via `PATH`.
5. **Open the MongoDB Shell (`mongosh`)**:
   ```powershell
   mongosh
   ```
   The shell prompt (e.g., `test>`) means your local server is responding.

## 3️⃣ Creating a Database and Collections
Run the following commands inside `mongosh`:
```javascript
use medicare_db
db.createCollection("products")
db.createCollection("users")
db.createCollection("orders")
show collections
```
- `use medicare_db` switches the shell context to a database named `medicare_db`; MongoDB creates it on demand once data is stored.
- `db.createCollection()` proactively creates empty collections so they appear immediately.
- A **document** is a JSON-like object stored inside a collection (similar to a row in relational databases).

## 4️⃣ Connecting MongoDB to Flask
1. **Install Python dependencies** (PowerShell or Command Prompt):
   ```powershell
   pip install flask flask-pymongo
   ```
2. **Create `app.py`** in your project directory:
   ```python
   from flask import Flask, jsonify
   from flask_pymongo import PyMongo

   app = Flask(__name__)
   app.config["MONGO_URI"] = "mongodb://localhost:27017/medicare_db"
   mongo = PyMongo(app)
   db = mongo.db

   @app.route("/test")
   def test_connection():
       return jsonify({"message": "Connected to MongoDB", "database": db.name})

   if __name__ == "__main__":
       app.run(debug=True)
   ```
3. **How it works**
   - `MONGO_URI` points to the local MongoDB service on port 27017 and selects the `medicare_db` database.
   - `PyMongo` acts as the bridge between Flask and MongoDB, handling the connection pool.
   - `db` is the entry point to all collections (e.g., `db.products`).
4. **Verify the connection**:
   ```powershell
   python app.py
   ```
   Browse to <http://127.0.0.1:5000/test>; you should see JSON confirming the database name.

## 5️⃣ Basic CRUD Operations (PyMongo)
Append the following routes to `app.py` to perform CRUD on the `products` collection:
```python
from bson import ObjectId

@app.route("/create")
def create_product():
    db.products.insert_one({"name": "Paracetamol", "price": 5.5, "stock": 100})
    return {"message": "Product created"}

@app.route("/products")
def list_products():
    products = list(db.products.find())
    for product in products:
        product["_id"] = str(product["_id"])
    return {"products": products}

@app.route("/update/<id>")
def update_product(id):
    db.products.update_one({"_id": ObjectId(id)}, {"$set": {"stock": 80}})
    return {"message": "Stock updated"}

@app.route("/delete/<id>")
def delete_product(id):
    db.products.delete_one({"_id": ObjectId(id)})
    return {"message": "Product deleted"}
```
- `/create` inserts a new product document.
- `/products` reads all products, converts each `_id` from `ObjectId` to string (JSON-safe), and returns them.
- `/update/<id>` updates the `stock` value for a document matching the provided `_id`.
- `/delete/<id>` removes the matching document from the collection.
- Importing `ObjectId` is required to query by the MongoDB document identifier.

## 6️⃣ Using Environment Variables
1. **Create a `.env` file** at your project root:
   ```
   MONGO_URI=mongodb://localhost:27017/medicare_db
   ```
2. **Load the variable in `app.py`**:
   ```python
   import os
   from dotenv import load_dotenv

   load_dotenv()
   app.config["MONGO_URI"] = os.getenv("MONGO_URI")
   ```
   - Install python-dotenv if needed: `pip install python-dotenv`.
   - This keeps credentials out of source code and allows different URIs per environment.

## 7️⃣ Optional: Connect to MongoDB Atlas (Cloud)
1. Sign up at <https://www.mongodb.com/atlas> and create a free shared cluster.
2. Create a database user with a strong password and whitelist your IP (or `0.0.0.0/0` for development).
3. Copy the provided connection string and replace placeholders:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/medicare_db
   ```
4. Store this URI in `.env` as `MONGO_URI` and restart Flask; PyMongo will connect to the cloud cluster instead of localhost.

## 8️⃣ Verify Everything Works
1. Run Flask:
   ```powershell
   python app.py
   ```
2. Test endpoints in your browser:
   - `/test` → confirms the database connection.
   - `/create` → inserts a product.
   - `/products` → lists current products.
   - `/update/<id>` and `/delete/<id>` → update/delete operations (use `_id` values from `/products`).
3. Check the data in MongoDB Shell:
   ```powershell
   mongosh
   use medicare_db
   db.products.find().pretty()
   ```
   You should see the inserted documents and any updates or deletions reflected.

## 9️⃣ Best Practices
- Never hardcode credentials or production URIs in source control; rely on environment variables.
- Always convert `_id` fields to strings before returning JSON responses.
- Add indexes to frequently queried fields. For example, in `mongosh`:
  ```javascript
  db.products.createIndex({"name": 1}, {unique: true})
  ```
  This enforces unique product names and speeds up lookups.

## 🔟 Conclusion
You installed MongoDB on Windows, created the `medicare_db` database with initial collections, wired it into a Flask app via PyMongo, implemented CRUD routes, and secured your configuration with environment variables. From here, expand your API with validation, authentication, and deployment options (e.g., hosting Flask on a server and switching to MongoDB Atlas for managed hosting).

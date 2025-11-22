# Creating and Connecting a MongoDB Database for Your Web App

## 1️⃣ Introduction
MongoDB is a NoSQL, document-oriented database that stores data in flexible JSON-like documents called BSON. Unlike SQL databases that rely on rigid tables and rows, MongoDB lets you define structure per document, making it easier to evolve schemas as your application grows. This document model promotes rapid development, scales horizontally through sharding, and works well with modern web stacks.

## 2️⃣ Installation
Follow these steps to install MongoDB Community Edition locally on Windows, macOS, or Linux.

1. **Download the installer**
   - Visit [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community).
   - Choose the version for your operating system and download the installer or archive.
2. **Install MongoDB**
   - **Windows**: Run the `.msi` installer, accept defaults, and select "Install MongoDB as a Service" when prompted.
   - **macOS**: With Homebrew, run:
     ```bash
     brew tap mongodb/brew
     brew install mongodb-community
     ```
   - **Linux (Ubuntu/Debian example)**:
     ```bash
     sudo apt-get update
     sudo apt-get install -y mongodb
     ```
3. **Start the MongoDB service**
   - **Windows**: Services should start automatically; otherwise open *Services* app and start *MongoDB*.
   - **macOS**:
     ```bash
     brew services start mongodb-community
     ```
   - **Linux**:
     ```bash
     sudo systemctl start mongod
     ```
4. **Verify MongoDB is running**
   ```bash
   mongod --version
   ```
   ```bash
   sudo systemctl status mongod   # Linux
   ```
   ```bash
   ps aux | grep mongod           # macOS or Linux
   ```
5. **Connect using `mongosh`**
   ```bash
   mongosh
   ```
   You should see the MongoDB shell prompt (e.g., `test>`).

## 3️⃣ Creating a Database and Collection
In MongoDB, a *database* groups collections, and a *collection* groups related documents (similar to tables). Databases are created implicitly when you first store data. Use the MongoDB Shell to name your database and prepare empty collections:

```bash
use medicare_db
db.createCollection("products")
db.createCollection("users")
db.createCollection("orders")
show collections
```

Running `use medicare_db` switches the context to the `medicare_db` database. MongoDB defers actual creation until data is inserted, but `db.createCollection()` explicitly prepares the collections so they appear when you run `show collections`.

## 4️⃣ Connecting MongoDB to a Flask App
Install the required packages:

```bash
pip install flask pymongo
pip install flask-pymongo
```

Create a minimal Flask app (`app.py`) that connects to MongoDB and exposes a test endpoint:

```python
from flask import Flask
from flask_pymongo import PyMongo

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb://localhost:27017/medicare_db"
mongo = PyMongo(app)
db = mongo.db

@app.route("/test")
def test_connection():
    return {"message": "Connected to MongoDB", "database": db.name}

if __name__ == "__main__":
    app.run(debug=True)
```

- `MONGO_URI` is the connection string pointing to a MongoDB server. `mongodb://localhost:27017/medicare_db` targets a MongoDB instance running on your machine and selects the `medicare_db` database.
- `PyMongo` establishes the connection and provides `mongo.db`, which references your database. Flask routes can then use `db` to access collections.
- When you start building CRUD routes, convert MongoDB `ObjectId` values to strings before returning them in JSON responses (e.g., `str(document["_id"])`).

## 5️⃣ Connecting MongoDB to Node.js (Optional)
If you prefer Node.js, install Mongoose and connect similarly:

```bash
npm install mongoose
```

```js
import mongoose from "mongoose";

await mongoose.connect("mongodb://localhost:27017/medicare_db");

console.log("Connected to MongoDB");
```

Mongoose manages MongoDB connections, schemas, and models. Once you define a model and save documents, Mongoose automatically creates the corresponding collections in your database.

## 6️⃣ Configuration Best Practices
Keep connection strings out of source control by using environment variables. Create a `.env` file:

```
MONGO_URI=mongodb://localhost:27017/medicare_db
```

Load it in Flask using Python's `os` module (and `python-dotenv` if desired):

```python
import os
from flask import Flask
from flask_pymongo import PyMongo

app = Flask(__name__)
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://localhost:27017/medicare_db")
mongo = PyMongo(app)
```

Switch between local and cloud instances by updating `MONGO_URI`. For MongoDB Atlas, replace the URI with the connection string provided by Atlas.

## 7️⃣ Optional: Connect to MongoDB Atlas
1. Sign in to [MongoDB Atlas](https://www.mongodb.com/atlas/database) and create a free cluster.
2. Create a database user with a strong password.
3. Allow access from your IP (or `0.0.0.0/0` for development).
4. Copy the connection string, replacing placeholders:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/medicare_db
   ```
5. Store this string in your `.env` file as `MONGO_URI`.
6. Update your Flask or Node.js configuration to use the environment variable.

## 8️⃣ Verifying the Connection
1. Run the Flask app:
   ```bash
   python app.py
   ```
2. Visit `http://127.0.0.1:5000/test` in your browser or use `curl` to see the JSON confirmation that MongoDB is connected.
3. In `mongosh`, run:
   ```bash
   use medicare_db
   show collections
   ```
   The `products`, `users`, and `orders` collections should be listed.

## 9️⃣ Conclusion
You have installed MongoDB, created the `medicare_db` database with the `products`, `users`, and `orders` collections, connected it to a Flask app (and optionally Node.js via Mongoose), and verified the connection. Next steps include defining data models, building CRUD endpoints, and enforcing validation rules.

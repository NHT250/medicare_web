import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import adminApi from "../api";
import { categoriesAPI } from "../../services/api";
import config from "../../config";

const defaultPagination = { page: 1, pages: 1, total: 0, per_page: 10 };

const AdminProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: config.PRODUCTS_PER_PAGE,
        ...(search && { q: search }),
        ...(category !== "all" && { category }),
      };
      const response = await adminApi.products.list(params);
      setProducts(response.items || []);
      setPagination({
        page: response.page || page,
        pages: response.pages || 1,
        total: response.total || 0,
        per_page: response.per_page || config.PRODUCTS_PER_PAGE,
      });
    } catch (err) {
      console.error("Failed to load products", err);
      setError(
        err?.response?.data?.error || "Unable to load products. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await categoriesAPI.getAll();
        setCategories(data.categories || []);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    loadCategories();
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchProducts(1);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm("Delete this product?")) {
      return;
    }
    try {
      await adminApi.products.remove(productId);
      fetchProducts(pagination.page);
    } catch (err) {
      console.error("Failed to delete product", err);
      alert(err?.response?.data?.error || "Unable to delete product");
    }
  };

  const tableRows = useMemo(
    () =>
      products.map((product) => {
        const discount = product.discount || 0;
        const finalPrice = product.price * (1 - discount / 100);
        return (
          <tr key={product._id}>
            <td>
              <div className="d-flex align-items-center">
                <img
                  src={product.images?.[0] || "https://via.placeholder.com/60"}
                  alt={product.name}
                  className="rounded me-3"
                  style={{ width: 60, height: 60, objectFit: "cover" }}
                />
                <div>
                  <div className="fw-semibold text-primary">{product.name}</div>
                  <small className="text-muted">/{product.slug}</small>
                </div>
              </div>
            </td>
            <td className="text-capitalize">{product.category}</td>
            <td>
              <div className="fw-semibold text-success">
                ${finalPrice.toFixed(2)}
              </div>
              {discount > 0 && (
                <small className="text-muted text-decoration-line-through">
                  ${Number(product.price).toFixed(2)}
                </small>
              )}
            </td>
            <td>
              <span className={`badge ${product.stock > 0 ? "bg-success" : "bg-danger"}`}>
                {product.stock} in stock
              </span>
            </td>
            <td>
              <span className={`badge ${product.is_active ? "bg-primary" : "bg-secondary"}`}>
                {product.is_active ? "Active" : "Hidden"}
              </span>
            </td>
            <td>{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</td>
            <td className="text-end">
              <button
                className="btn btn-sm btn-outline-primary me-2"
                onClick={() => navigate(`/admin/products/${product._id}/edit`)}
              >
                <i className="fas fa-edit me-1" /> Edit
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDelete(product._id)}
              >
                <i className="fas fa-trash me-1" /> Delete
              </button>
            </td>
          </tr>
        );
      }),
    [navigate, pagination.page, products]
  );

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Products</h2>
          <p className="text-muted mb-0">Manage the catalog of medications and medical supplies.</p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          <i className="fas fa-plus me-2" /> Add Product
        </Link>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Product name or slug"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <button type="submit" className="btn btn-outline-primary me-2">
                <i className="fas fa-search me-1" /> Search
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  fetchProducts(1);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error}</div>}
          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : tableRows.length > 0 ? (
                  tableRows
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-muted">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Total {pagination.total} products — Page {pagination.page}/{pagination.pages}
          </small>
          <div className="btn-group">
            <button
              className="btn btn-outline-secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchProducts(pagination.page - 1)}
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => fetchProducts(pagination.page + 1)}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProducts;

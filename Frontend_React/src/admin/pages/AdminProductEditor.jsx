import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import adminApi from "../api";
import ImagePicker from "../components/ImagePicker";
import { FIXED_CATEGORIES } from "../../constants/categories";

const emptyProduct = {
  name: "",
  slug: "",
  category: "",
  price: 0,
  discount: 0,
  stock: 0,
  is_active: true,
  images: [],
  description: "",
  specifications: [{ key: "", value: "" }],
};

const AdminProductEditor = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = mode === "edit" && id;

  const [product, setProduct] = useState(emptyProduct);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [lastSaved, setLastSaved] = useState(null);

  const finalPrice = useMemo(() => {
    const discountFactor = 1 - (Number(product.discount) || 0) / 100;
    return Math.max(Number(product.price || 0) * discountFactor, 0);
  }, [product.discount, product.price]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await adminApi.products.get(id);
        const payload = response.product || {};
        setProduct({
          ...emptyProduct,
          ...payload,
          price: payload.price ?? 0,
          discount: payload.discount ?? 0,
          stock: payload.stock ?? 0,
          images: payload.images?.length ? payload.images : [],
          specifications:
            payload.specifications?.length > 0
              ? payload.specifications
              : [{ key: "", value: "" }],
        });
      } catch (err) {
        console.error("Failed to load product", err);
        setError(err?.response?.data?.error || "Product not found");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, isEditMode]);

  const handleFieldChange = (field, value) => {
    setProduct((prev) => ({ ...prev, [field]: value }));
  };

  const handleImagesChange = (images) => {
    setProduct((prev) => ({ ...prev, images }));
  };

  const handleSpecificationChange = (index, field, value) => {
    setProduct((prev) => {
      const specifications = [...prev.specifications];
      specifications[index] = { ...specifications[index], [field]: value };
      return { ...prev, specifications };
    });
  };

  const addSpecification = () => {
    setProduct((prev) => ({
      ...prev,
      specifications: [...(prev.specifications || []), { key: "", value: "" }],
    }));
  };

  const removeSpecification = (index) => {
    setProduct((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, idx) => idx !== index),
    }));
  };

  const validateProduct = () => {
    if (!product.name.trim()) {
      alert("Product name is required");
      return false;
    }
    if (!product.category.trim()) {
      alert("Category is required");
      return false;
    }
    if (!FIXED_CATEGORIES.some((item) => item.slug === product.category)) {
      alert("Please select a valid category");
      return false;
    }
    if (Number(product.price) < 0) {
      alert("Invalid price");
      return false;
    }
    if (Number(product.stock) < 0) {
      alert("Invalid stock quantity");
      return false;
    }
    if (product.images.length === 0) {
      alert("Please add at least one image");
      return false;
    }
    return true;
  };

  const saveProduct = async ({ closeAfterSave } = {}) => {
    if (!validateProduct()) {
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...product,
        price: Number(product.price),
        discount: Number(product.discount) || 0,
        stock: Number(product.stock),
        specifications: (product.specifications || []).filter((item) => item.key),
      };
      let response;
      if (isEditMode) {
        response = await adminApi.products.update(id, payload);
      } else {
        response = await adminApi.products.create(payload);
        const createdId = response?.product?._id;
        if (createdId) {
          navigate(`/admin/products/${createdId}/edit`, { replace: true });
        }
      }
      const savedProduct = response?.product || payload;
      setProduct({
        ...savedProduct,
        specifications:
          savedProduct.specifications?.length > 0
            ? savedProduct.specifications
            : [{ key: "", value: "" }],
      });
      setLastSaved(new Date());
      if (closeAfterSave) {
        navigate("/admin/products");
      }
    } catch (err) {
      console.error("Save failed", err);
      alert(err?.response?.data?.errors?.join("\n") || err?.response?.data?.error || "Unable to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) {
      return;
    }
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }
    try {
      await adminApi.products.remove(id);
      navigate("/admin/products");
    } catch (err) {
      console.error("Delete failed", err);
      alert(err?.response?.data?.error || "Unable to delete product");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger my-4 mx-4">
        {error}
        <button className="btn btn-link" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">
            {isEditMode ? "Edit Product" : "Create Product"}
          </h2>
          <p className="text-muted mb-0">
            The editor mirrors the product detail page for a familiar workflow.
          </p>
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/products")}> 
          <i className="fas fa-arrow-left me-2" /> Back to list
        </button>
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white">
              <h5 className="card-title mb-0">Images</h5>
            </div>
            <div className="card-body">
              <ImagePicker images={product.images} setImages={handleImagesChange} />
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={product.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    onBlur={() => {
                      if (!product.slug) {
                        handleFieldChange(
                          "slug",
                          product.name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "")
                        );
                      }
                    }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Slug</label>
                  <input
                    type="text"
                    className="form-control"
                    value={product.slug}
                    onChange={(e) => handleFieldChange("slug", e.target.value)}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select text-capitalize"
                    value={product.category}
                    onChange={(e) => handleFieldChange("category", e.target.value)}
                  >
                    <option value="">Select a category</option>
                    {FIXED_CATEGORIES.map((categoryOption) => (
                      <option key={categoryOption.id} value={categoryOption.slug}>
                        {categoryOption.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={product.price}
                    onChange={(e) => handleFieldChange("price", e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Discount (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={product.discount}
                    onChange={(e) => handleFieldChange("discount", e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={product.stock}
                    onChange={(e) => handleFieldChange("stock", e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label d-block">Status</label>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={product.is_active}
                      onChange={(e) => handleFieldChange("is_active", e.target.checked)}
                    />
                    <label className="form-check-label">
                      {product.is_active ? "Active" : "Hidden"}
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-light rounded border p-3 mt-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <span className="text-muted">Price after discount</span>
                    <div className="fs-4 text-success fw-semibold">${finalPrice.toFixed(2)}</div>
                  </div>
                  <span className={`badge ${product.stock > 0 ? "bg-success" : "bg-danger"}`}>
                    {product.stock > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mt-4">
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "description" ? "active" : ""}`}
                    onClick={() => setActiveTab("description")}
                    type="button"
                  >
                    Description
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "specifications" ? "active" : ""}`}
                    onClick={() => setActiveTab("specifications")}
                    type="button"
                  >
                    Specifications
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    className={`nav-link ${activeTab === "reviews" ? "active" : ""}`}
                    onClick={() => setActiveTab("reviews")}
                    type="button"
                  >
                    Reviews
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === "description" && (
                <div>
                  <label className="form-label">Detailed Description</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    value={product.description}
                    onChange={(e) => handleFieldChange("description", e.target.value)}
                  />
                </div>
              )}
              {activeTab === "specifications" && (
                <div className="d-flex flex-column gap-3">
                  {product.specifications.map((item, index) => (
                    <div key={index} className="row g-2 align-items-center">
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Attribute"
                          value={item.key}
                          onChange={(e) => handleSpecificationChange(index, "key", e.target.value)}
                        />
                      </div>
                      <div className="col-md-5">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Value"
                          value={item.value}
                          onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
                        />
                      </div>
                      <div className="col-md-2 text-end">
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeSpecification(index)}
                          disabled={product.specifications.length <= 1}
                        >
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="btn btn-outline-primary" onClick={addSpecification}>
                    <i className="fas fa-plus me-1" /> Add row
                  </button>
                </div>
              )}
              {activeTab === "reviews" && (
                <div className="text-muted">
                  Mock mode is showing {product.reviewsCount || 0} reviews. Administrators cannot edit them here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mt-4 sticky-bottom" style={{ zIndex: 10 }}>
        <div className="card-body d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="text-muted">
            {saving ? "Saving..." : lastSaved ? `Last saved at ${lastSaved.toLocaleTimeString()}` : "Not saved yet"}
          </div>
          <div className="btn-group">
            {isEditMode && (
              <button type="button" className="btn btn-outline-danger" onClick={handleDelete} disabled={saving}>
                <i className="fas fa-trash me-1" /> Delete
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => saveProduct({ closeAfterSave: false })}
              disabled={saving}
            >
              <i className="fas fa-save me-1" /> Save
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => saveProduct({ closeAfterSave: true })}
              disabled={saving}
            >
              <i className="fas fa-check me-1" /> Save & Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProductEditor;

import { useMemo, useState } from "react";
import config from "../../config";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_MB = 5;

function validateImageLink(urlString) {
  try {
    const url = new URL(urlString);
    if (!/\.(jpe?g|png|gif|webp)$/i.test(url.pathname)) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

export default function ImagePicker({ images = [], setImages }) {
  const [activeTab, setActiveTab] = useState("upload");
  const [linkValue, setLinkValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const previewImage = useMemo(() => images[0] || null, [images]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      window.alert("??nh d?ng ?nh kh?ng h? tr?");
      event.target.value = "";
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_SIZE_MB) {
      window.alert(`K?ch th??c ?nh t?i ?a ${MAX_SIZE_MB}MB`);
      event.target.value = "";
      return;
    }

    const token = localStorage.getItem(config.STORAGE_KEYS.TOKEN);
    if (!token) {
      window.alert("Vui l?ng ??ng nh?p l?i ?? t?i ?nh");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true);
    try {
      const endpoint = new URL("/api/admin/uploads", config.API_URL);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "T?i l?n th?t b?i");
      }

      setImages([...(images || []), data.url]);
    } catch (error) {
      window.alert(error.message || "Kh?ng th? t?i ?nh");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const handleAddLink = () => {
    if (!linkValue.trim()) {
      return;
    }
    if (!validateImageLink(linkValue.trim())) {
      window.alert("Li?n k?t kh?ng ph?i h?nh ?nh h?p l?");
      return;
    }
    setImages([...(images || []), linkValue.trim()]);
    setLinkValue("");
  };

  const removeImage = (index) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const moveImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= images.length) {
      return;
    }
    const updated = [...images];
    const [selected] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, selected);
    setImages(updated);
  };

  const setAsPrimary = (index) => {
    if (index === 0) {
      return;
    }
    const updated = [...images];
    const [selected] = updated.splice(index, 1);
    updated.unshift(selected);
    setImages(updated);
  };

  return (
    <div className="image-picker">
      <div className="mb-3">
        <div className="btn-group" role="group" aria-label="Image picker mode">
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "upload" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setActiveTab("upload")}
            disabled={isUploading}
          >
            <i className="fas fa-upload me-1" /> T?i t?p l?n
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "link" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setActiveTab("link")}
          >
            <i className="fas fa-link me-1" /> Th?m t? li?n k?t
          </button>
        </div>
      </div>

      {activeTab === "upload" ? (
        <div className="mb-3">
          <input
            type="file"
            accept="image/*"
            className="form-control"
            onChange={handleUpload}
            disabled={isUploading}
          />
          {isUploading && (
            <div className="form-text text-primary">?ang t?i...</div>
          )}
          <div className="form-text">
            H? tr? JPG, PNG, GIF v? WEBP. K?ch th??c t?i ?a {MAX_SIZE_MB}MB.
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <div className="input-group">
            <input
              type="url"
              className="form-control"
              placeholder="https://example.com/image.jpg"
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
            />
            <button type="button" className="btn btn-outline-primary" onClick={handleAddLink}>
              Add
            </button>
          </div>
          <div className="form-text">D?n li?n k?t ?nh tr?c ti?p (JPG, PNG, GIF, WEBP).</div>
        </div>
      )}

      <div className="mb-3">
        <div className="ratio ratio-4x3 bg-light rounded border d-flex align-items-center justify-content-center">
          {previewImage ? (
            <img
              src={previewImage}
              alt="?nh ch?nh"
              className="img-fluid rounded"
              style={{ maxHeight: 260, objectFit: "contain" }}
            />
          ) : (
            <span className="text-muted">Ch?a c? h?nh ?nh n?o</span>
          )}
        </div>
      </div>

      <div className="row g-2">
        {images.map((url, index) => (
          <div className="col-6 col-md-4" key={`${url}-${index}`}>
            <div className="border rounded position-relative p-1 h-100">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-100 rounded"
                style={{ height: 120, objectFit: "cover" }}
                onClick={() => setAsPrimary(index)}
              />
              <div className="d-flex justify-content-between align-items-center mt-2">
                <div>
                  {index === 0 ? (
                    <span className="badge bg-primary">?nh ch?nh</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0"
                      onClick={() => setAsPrimary(index)}
                    >
                      ??t l?m ?nh ch?nh
                    </button>
                  )}
                </div>
                <div className="btn-group btn-group-sm">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    title="Di chuy?n l?n"
                  >
                    <i className="fas fa-arrow-up" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    title="Di chuy?n xu?ng"
                  >
                    <i className="fas fa-arrow-down" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeImage(index)}
                    title="X?a ?nh"
                  >
                    <i className="fas fa-times" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

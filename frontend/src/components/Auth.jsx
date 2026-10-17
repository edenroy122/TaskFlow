import React, { useState } from "react";
import { api } from "../api";
import { IconSparkles, IconMail, IconLock, IconUser, IconCheck } from "./Icons";

export const Auth = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (isRegister) {
      // Email format regex validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(formData.email.trim())) {
        setError("Please enter a valid email address (e.g. user@company.com)");
        return;
      }

      // Password complexity validation
      const pwd = formData.password;
      if (pwd.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (!/[A-Z]/.test(pwd)) {
        setError("Password must contain at least 1 uppercase letter.");
        return;
      }
      if (!/[a-z]/.test(pwd)) {
        setError("Password must contain at least 1 lowercase letter.");
        return;
      }
      if (!/[0-9]/.test(pwd)) {
        setError("Password must contain at least 1 number.");
        return;
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
        setError("Password must contain at least 1 special character (e.g. !@#$%^&*).");
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await api.register(formData.name, formData.email, formData.password);
        setIsRegister(false);
        setSuccessMsg("Registration successful! Please log in to continue.");
        setFormData((prev) => ({ ...prev, password: "" }));
      } else {
        const data = await api.login(formData.email, formData.password);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <IconSparkles size={24} />
          </div>
          <h1 className="auth-title">Task Flow</h1>
          <p className="auth-subtitle">Enterprise team collaboration suite</p>
        </div>

        {/* Tab Selector */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${!isRegister ? "active" : ""}`}
            onClick={() => {
              setIsRegister(false);
              setError("");
              setSuccessMsg("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${isRegister ? "active" : ""}`}
            onClick={() => {
              setIsRegister(true);
              setError("");
              setSuccessMsg("");
            }}
          >
            Register
          </button>
        </div>

        {successMsg && (
          <div className="alert-success flex items-center gap-2">
            <IconCheck size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-with-icon">
                <IconUser size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Work Email</label>
            <div className="input-with-icon">
              <IconMail size={18} className="input-icon" />
              <input
                type="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <IconLock size={18} className="input-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            {isRegister && (
              <p className="text-2xs text-muted margin-top-1">
                Must be at least 8 characters, with 1 uppercase, 1 lowercase, 1 number & 1 special character.
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary btn-full btn-lg margin-top-2" disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Complete Registration" : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <p className="text-xs text-muted">
            {isRegister
              ? "By signing up, you agree to workspace policies."
              : "Enterprise security with encrypted token authentication."}
          </p>
        </div>
      </div>
    </div>
  );
};

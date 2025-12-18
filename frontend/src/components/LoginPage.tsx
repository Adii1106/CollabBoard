import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
            const { data } = await api.post(endpoint, { username, password });

            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect to home or previous page
            navigate("/");
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || "An error occurred");
        }
    };

    return (
        <div className="container d-flex justify-content-center align-items-center vh-100">
            <div className="card p-4" style={{ maxWidth: "400px", width: "100%" }}>
                <h2 className="text-center mb-4">{isLogin ? "Login" : "Sign Up"}</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-control"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary w-100">
                        {isLogin ? "Login" : "Sign Up"}
                    </button>
                </form>
                <div className="mt-3 text-center">
                    <button
                        className="btn btn-link"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? "Need an account? Sign Up" : "Have an account? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
}

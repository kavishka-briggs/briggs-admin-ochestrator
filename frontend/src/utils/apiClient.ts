import axios, { AxiosInstance } from "axios";
import { GATEWAY_URL } from "../config";

export const apiClient = (): AxiosInstance => {
    const token = localStorage.getItem("token");

    const headers = {
        Authorization: `Bearer ${token}`
    };

    if (!GATEWAY_URL) {
        throw new Error("Gateway URL is not defined!");
    }
    const instance = axios.create({
        baseURL: GATEWAY_URL,
        headers: headers,
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            return Promise.reject(error);
        }
    );

    return instance;
}

import { axiosInstance } from "./axios";

export const api = {
  get: axiosInstance.get,
  post: axiosInstance.post,
  put: axiosInstance.put,
  delete: axiosInstance.delete,
  defaults: axiosInstance.defaults,
};

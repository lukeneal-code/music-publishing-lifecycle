"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ApiClient: () => ApiClient,
  AuthApi: () => AuthApi,
  DealsApi: () => DealsApi,
  RoyaltiesApi: () => RoyaltiesApi,
  WorksApi: () => WorksApi,
  createApiClient: () => createApiClient
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_axios = __toESM(require("axios"));
var ApiClient = class {
  client;
  config;
  constructor(config) {
    this.config = config;
    this.client = import_axios.default.create({
      baseURL: config.baseUrl,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.client.interceptors.request.use(
      (requestConfig) => {
        if (this.config.getAccessToken) {
          const token = this.config.getAccessToken();
          if (token && requestConfig.headers) {
            requestConfig.headers.Authorization = `Bearer ${token}`;
          }
        }
        return requestConfig;
      },
      (error) => Promise.reject(error)
    );
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.config.onUnauthorized?.();
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }
  handleError(error) {
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error("An unexpected error occurred");
  }
  get instance() {
    return this.client;
  }
  async get(url, params) {
    const response = await this.client.get(url, { params });
    return response.data;
  }
  async post(url, data) {
    const response = await this.client.post(url, data);
    return response.data;
  }
  async put(url, data) {
    const response = await this.client.put(url, data);
    return response.data;
  }
  async patch(url, data) {
    const response = await this.client.patch(url, data);
    return response.data;
  }
  async delete(url) {
    const response = await this.client.delete(url);
    return response.data;
  }
};
function createApiClient(config) {
  return new ApiClient(config);
}

// src/auth.ts
var AuthApi = class {
  constructor(client) {
    this.client = client;
  }
  async login(credentials) {
    return this.client.post("/auth/login", credentials);
  }
  async register(data) {
    return this.client.post("/auth/register", data);
  }
  async refreshToken(data) {
    return this.client.post("/auth/refresh", data);
  }
  async logout() {
    return this.client.post("/auth/logout");
  }
  async getMe() {
    return this.client.get("/auth/me");
  }
  async requestPasswordReset(email) {
    return this.client.post("/auth/password/reset", { email });
  }
  async confirmPasswordReset(token, newPassword) {
    return this.client.post("/auth/password/reset/confirm", {
      token,
      new_password: newPassword
    });
  }
};

// src/works.ts
var WorksApi = class {
  constructor(client) {
    this.client = client;
  }
  // Works
  async listWorks(params) {
    return this.client.get("works", params);
  }
  async searchWorks(query, params) {
    return this.client.get("works/search", { q: query, ...params });
  }
  async searchSimilar(request) {
    return this.client.post("works/search/similar", request);
  }
  async getWork(id) {
    return this.client.get(`works/${id}`);
  }
  async createWork(data) {
    return this.client.post("works", data);
  }
  async updateWork(id, data) {
    return this.client.put(`works/${id}`, data);
  }
  async deleteWork(id) {
    return this.client.delete(`works/${id}`);
  }
  // Recordings
  async getWorkRecordings(workId) {
    return this.client.get(`works/${workId}/recordings`);
  }
  async createRecording(workId, data) {
    return this.client.post(`works/${workId}/recordings`, data);
  }
  async getRecording(workId, recordingId) {
    return this.client.get(`works/${workId}/recordings/${recordingId}`);
  }
  async updateRecording(workId, recordingId, data) {
    return this.client.put(`works/${workId}/recordings/${recordingId}`, data);
  }
  async deleteRecording(workId, recordingId) {
    return this.client.delete(`works/${workId}/recordings/${recordingId}`);
  }
  // Writers
  async getWorkWriters(workId) {
    return this.client.get(`works/${workId}/writers`);
  }
  async addWorkWriter(workId, data) {
    return this.client.post(`works/${workId}/writers`, data);
  }
  async removeWorkWriter(workId, songwriterId) {
    return this.client.delete(`works/${workId}/writers/${songwriterId}`);
  }
};

// src/deals.ts
var DealsApi = class {
  constructor(client) {
    this.client = client;
  }
  async listDeals(params) {
    return this.client.get("deals", params);
  }
  async getDeal(id) {
    return this.client.get(`deals/${id}`);
  }
  async createDeal(data) {
    return this.client.post("deals", data);
  }
  async updateDeal(id, data) {
    return this.client.put(`deals/${id}`, data);
  }
  async deleteDeal(id) {
    return this.client.delete(`deals/${id}`);
  }
  // Deal Works
  async getDealWorks(dealId) {
    return this.client.get(`deals/${dealId}/works`);
  }
  async addWorkToDeal(dealId, workId) {
    return this.client.post(`deals/${dealId}/works`, { work_id: workId });
  }
  async removeWorkFromDeal(dealId, workId) {
    return this.client.delete(`deals/${dealId}/works/${workId}`);
  }
  // Songwriter deals
  async getSongwriterDeals(songwriterId) {
    return this.client.get(`songwriters/${songwriterId}/deals`);
  }
  // Contract generation
  async generateContract(dealId) {
    return this.client.post(`deals/${dealId}/generate-contract`);
  }
  async getContract(dealId) {
    return this.client.get(`deals/${dealId}/contract`);
  }
  async signDeal(dealId) {
    return this.client.post(`deals/${dealId}/sign`);
  }
  // Songwriters (for deal creation)
  async listSongwriters(params) {
    return this.client.get("deals/songwriters/", params);
  }
};

// src/royalties.ts
var RoyaltiesApi = class {
  constructor(client) {
    this.client = client;
  }
  // Periods
  async listPeriods(params) {
    return this.client.get("/royalties/periods", params);
  }
  async getPeriod(id) {
    return this.client.get(`/royalties/periods/${id}`);
  }
  async createPeriod(data) {
    return this.client.post("/royalties/periods", data);
  }
  async calculatePeriod(id) {
    return this.client.post(`/royalties/periods/${id}/calculate`);
  }
  async approvePeriod(id) {
    return this.client.post(`/royalties/periods/${id}/approve`);
  }
  // Statements
  async listStatements(params) {
    return this.client.get("/royalties/statements", params);
  }
  async getStatement(id) {
    return this.client.get(`/royalties/statements/${id}`);
  }
  async getStatementPdf(id) {
    const response = await this.client.instance.get(`/royalties/statements/${id}/pdf`, {
      responseType: "blob"
    });
    return response.data;
  }
  async getStatementLineItems(id) {
    return this.client.get(`/royalties/statements/${id}/line-items`);
  }
  // Songwriter royalties
  async getSongwriterRoyalties(songwriterId) {
    return this.client.get(`/songwriters/${songwriterId}/royalties`);
  }
  async getSongwriterSummary(songwriterId) {
    return this.client.get(`/songwriters/${songwriterId}/royalties/summary`);
  }
  async getTopPerformingWorks(songwriterId, limit) {
    return this.client.get(`/songwriters/${songwriterId}/works/top`, { limit });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ApiClient,
  AuthApi,
  DealsApi,
  RoyaltiesApi,
  WorksApi,
  createApiClient
});

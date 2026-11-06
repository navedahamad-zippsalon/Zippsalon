/**
 * OpenAPI 3.0 Complete Path Definitions for all Zippsalon Endpoints
 * Auto-generated and maintained for 100% documentation coverage
 */
import { openapiSchemas } from "./schemas";

export const openapiPaths: Record<string, any> = {
  "/api/v1/admin/posts": {
    "get": {
      "tags": [
        "Admin"
      ],
      "summary": "GET /api/v1/admin/posts",
      "description": "Handles GET request for endpoint /api/v1/admin/posts",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
  },
  "/api/v1/admin/reports": {
    "get": {
      "tags": [
        "Admin"
      ],
      "summary": "GET /api/v1/admin/reports",
      "description": "Handles GET request for endpoint /api/v1/admin/reports",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/salons": {
    "get": {
      "tags": [
        "Admin"
      ],
      "summary": "GET /api/v1/admin/salons",
      "description": "Handles GET request for endpoint /api/v1/admin/salons",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Admin"
      ],
      "summary": "POST /api/v1/admin/salons",
      "description": "Handles POST request for endpoint /api/v1/admin/salons",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/salons"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/salons/{id}": {
    "delete": {
      "tags": [
        "Admin"
      ],
      "summary": "DELETE /api/v1/admin/salons/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/admin/salons/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "Admin"
      ],
      "summary": "GET /api/v1/admin/salons/{id}",
      "description": "Handles GET request for endpoint /api/v1/admin/salons/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Admin"
      ],
      "summary": "PUT /api/v1/admin/salons/{id}",
      "description": "Handles PUT request for endpoint /api/v1/admin/salons/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/admin/salons/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/stories": {
    "get": {
      "tags": [
        "Admin"
      ],
      "summary": "GET /api/v1/admin/stories",
      "description": "Handles GET request for endpoint /api/v1/admin/stories",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/users": {
    "get": {
      "tags": [
        "Admin"
      ],
      "summary": "GET /api/v1/admin/users",
      "description": "Handles GET request for endpoint /api/v1/admin/users",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "/api/v1/admin/users/{id}/ai-image-access": {
          "get": {
            "tags": ["Admin"],
            "summary": "Get Vendor AI image generation assignment",
            "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
            "responses": {
              "200": { "description": "Explicit Vendor assignment; disabled by default" },
              "403": { "description": "Admin role required" },
              "404": { "description": "Active Vendor not found" }
            },
            "security": [{ "bearerAuth": [] }]
          },
          "put": {
            "tags": ["Admin"],
            "summary": "Enable or revoke Vendor AI image generation",
            "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }],
            "requestBody": {
              "required": true,
              "content": { "application/json": { "schema": { "type": "object", "required": ["enabled"], "properties": { "enabled": { "type": "boolean" } } } } }
            },
            "responses": {
              "200": { "description": "Assignment updated and audit logged" },
              "403": { "description": "Admin role required" },
              "404": { "description": "Active Vendor not found" }
            },
            "security": [{ "bearerAuth": [] }]
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/campaigns": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/campaigns",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/campaigns",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/campaigns",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/campaigns",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/campaigns"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/campaigns/{id}": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/campaigns/{id}",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/campaigns/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/config": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/config",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/config",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/config",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/config",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/config"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "PUT /api/v1/admin/whatsapp/config",
      "description": "Handles PUT request for endpoint /api/v1/admin/whatsapp/config",
      "parameters": [],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/admin/whatsapp/config"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/config/test": {
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/config/test",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/config/test",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/config/test"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/config/validate": {
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/config/validate",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/config/validate",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/config/validate"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/connections": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/connections",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/connections",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/connections",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/connections",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/connections"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/connections/{id}": {
    "delete": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "DELETE /api/v1/admin/whatsapp/connections/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/admin/whatsapp/connections/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "PUT /api/v1/admin/whatsapp/connections/{id}",
      "description": "Handles PUT request for endpoint /api/v1/admin/whatsapp/connections/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/admin/whatsapp/connections/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/dashboard": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/dashboard",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/dashboard",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/messages": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/messages",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/messages",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/pricing": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/pricing",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/pricing",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/pricing",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/pricing",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/pricing"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/pricing/{id}": {
    "delete": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "DELETE /api/v1/admin/whatsapp/pricing/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/admin/whatsapp/pricing/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "PUT /api/v1/admin/whatsapp/pricing/{id}",
      "description": "Handles PUT request for endpoint /api/v1/admin/whatsapp/pricing/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/admin/whatsapp/pricing/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/pricing/{id}/activate": {
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/pricing/{id}/activate",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/pricing/:id/activate",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/pricing/:id/activate"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/pricing/{id}/deactivate": {
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/pricing/{id}/deactivate",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/pricing/:id/deactivate",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/pricing/:id/deactivate"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/templates": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/templates",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/templates",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/templates",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/templates",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/templates"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/templates/{id}": {
    "delete": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "DELETE /api/v1/admin/whatsapp/templates/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/admin/whatsapp/templates/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "PUT /api/v1/admin/whatsapp/templates/{id}",
      "description": "Handles PUT request for endpoint /api/v1/admin/whatsapp/templates/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/admin/whatsapp/templates/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/templates/sync": {
    "post": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "POST /api/v1/admin/whatsapp/templates/sync",
      "description": "Handles POST request for endpoint /api/v1/admin/whatsapp/templates/sync",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/admin/whatsapp/templates/sync"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/admin/whatsapp/usage": {
    "get": {
      "tags": [
        "WhatsApp Admin"
      ],
      "summary": "GET /api/v1/admin/whatsapp/usage",
      "description": "Handles GET request for endpoint /api/v1/admin/whatsapp/usage",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/auth/change-password": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "POST /api/v1/auth/change-password",
      "description": "Handles POST request for endpoint /api/v1/auth/change-password",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/auth/change-password"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/auth/forgot-password": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "POST /api/v1/auth/forgot-password",
      "description": "Handles POST request for endpoint /api/v1/auth/forgot-password",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/auth/forgot-password"
            }
          }
        }
      }
    }
  },
  "/api/v1/auth/login": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "User login",
      "description": "Authenticates user with email and password, returning JWT bearer token.",
      "parameters": [],
      "responses": {
        "200": {
          "description": "Authentication successful",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AuthResponse"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/LoginDto"
            }
          }
        }
      }
    }
  },
  "/api/v1/auth/register": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "User registration",
      "description": "Registers a new user account with credentials and role.",
      "parameters": [],
      "responses": {
        "201": {
          "description": "User registered successfully",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AuthResponse"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/RegisterDto"
            }
          }
        }
      }
    }
  },
  "/api/v1/auth/reset-password": {
    "post": {
      "tags": [
        "Auth"
      ],
      "summary": "POST /api/v1/auth/reset-password",
      "description": "Handles POST request for endpoint /api/v1/auth/reset-password",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/auth/reset-password"
            }
          }
        }
      }
    }
  },
  "/api/v1/bookings/{id}": {
    "get": {
      "tags": [
        "Bookings"
      ],
      "summary": "GET /api/v1/bookings/{id}",
      "description": "Handles GET request for endpoint /api/v1/bookings/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "medium": {
                        "type": "string",
                        "enum": ["APP", "ONLINE", "IN_SALON"],
                        "description": "Booking channel: APP is Mobile App, ONLINE is Web, and IN_SALON is an in-salon booking."
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "patch": {
      "tags": [
        "Bookings"
      ],
      "summary": "PATCH /api/v1/bookings/{id}",
      "description": "Handles PATCH request for endpoint /api/v1/bookings/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Booking details may be updated as before. Admin may move an unpaid booking using a validated Vendor, Salon, and Branch; Vendors may select only their own Salon and Branch. Location changes are blocked once payment or finance records exist.",
              "properties": {
                "vendorId": { "type": "string", "format": "uuid", "description": "Admin selector only; Vendor identity is derived from authentication for Vendors." },
                "salonId": { "type": "string", "format": "uuid" },
                "branchId": { "type": "string", "format": "uuid", "nullable": true },
                "status": { "type": "string" },
                "bookingDate": { "type": "string", "format": "date-time" },
                "staffId": { "type": "string", "format": "uuid" },
                "notes": { "type": "string" }
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/bookings/{id}/cancel": {
    "patch": {
      "tags": [
        "Bookings"
      ],
      "summary": "PATCH /api/v1/bookings/{id}/cancel",
      "description": "Handles PATCH request for endpoint /api/v1/bookings/:id/cancel",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/bookings/:id/cancel"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/bookings/{id}/payments": {
    "post": {
      "tags": [
        "Bookings"
      ],
      "summary": "POST /api/v1/bookings/{id}/payments",
      "description": "Handles POST request for endpoint /api/v1/bookings/:id/payments",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/bookings/:id/payments"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/bookings/salon/{salonId}": {
    "get": {
      "tags": [
        "Bookings"
      ],
      "summary": "GET /api/v1/bookings/salon/{salonId}",
      "description": "Handles GET request for endpoint /api/v1/bookings/salon/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        },
        {
          "name": "source",
          "in": "query",
          "description": "Filter by original source: APP for Mobile App or WEB for Web (stored as medium ONLINE).",
          "schema": {
            "type": "string",
            "enum": ["APP", "WEB"]
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "bookings": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "properties": {
                            "medium": {
                              "type": "string",
                              "enum": ["APP", "ONLINE", "IN_SALON"],
                              "description": "Booking channel: APP is Mobile App, ONLINE is Web, and IN_SALON is an in-salon booking."
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Bookings"
      ],
      "summary": "POST /api/v1/bookings/salon/{salonId}",
      "description": "Handles POST request for endpoint /api/v1/bookings/salon/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Existing booking fields are unchanged. Admin may provide vendorId, Salon is selected by the salonId path, and branchId is optional. Vendors are scoped to their authenticated Vendor account; any supplied foreign vendorId is rejected.",
              "properties": {
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Admin selection. Never used as the Vendor identity for Vendor requests." },
                "branchId": { "type": "string", "format": "uuid", "nullable": true },
                "customerId": { "type": "string", "format": "uuid" },
                "customerData": { "type": "object" },
                "staffId": { "type": "string" },
                "bookingDate": { "type": "string", "format": "date-time" },
                "items": { "type": "array", "items": { "type": "object" } },
                "payment": { "type": "object" }
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/customers/{id}/salon/{salonId}": {
    "get": {
      "tags": [
        "Customers"
      ],
      "summary": "GET /api/v1/customers/{id}/salon/{salonId}",
      "description": "Handles GET request for endpoint /api/v1/customers/:id/salon/:salonId",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        },
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/customers/{id}/salon/{salonId}/details": {
    "get": {
      "tags": [
        "Customers"
      ],
      "summary": "GET /api/v1/customers/{id}/salon/{salonId}/details",
      "description": "Handles GET request for endpoint /api/v1/customers/:id/salon/:salonId/details",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        },
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/customers/salon/{salonId}": {
    "get": {
      "tags": [
        "Customers"
      ],
      "summary": "GET /api/v1/customers/salon/{salonId}",
      "description": "Handles GET request for endpoint /api/v1/customers/salon/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Customers"
      ],
      "summary": "POST /api/v1/customers/salon/{salonId}",
      "description": "Handles POST request for endpoint /api/v1/customers/salon/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/customers/salon/:salonId"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/customers/search": {
    "get": {
      "tags": [
        "Customers"
      ],
      "summary": "GET /api/v1/customers/search",
      "description": "Handles GET request for endpoint /api/v1/customers/search",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/dashboard/stats": {
    "get": {
      "tags": [
        "Dashboard"
      ],
      "summary": "GET /api/v1/dashboard/stats",
      "description": "Handles GET request for endpoint /api/v1/dashboard/stats",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/comments/{commentId}": {
    "delete": {
      "tags": [
        "Feed"
      ],
      "summary": "Delete comment",
      "description": "Permanently removes a comment from the post.",
      "parameters": [
        {
          "name": "commentId",
          "in": "path",
          "required": true,
          "description": "ID parameter for commentId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Comment deleted",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Comment deleted successfully"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Feed"
      ],
      "summary": "Edit comment",
      "description": "Modifies the text content of a comment owned by the authenticated user.",
      "parameters": [
        {
          "name": "commentId",
          "in": "path",
          "required": true,
          "description": "ID parameter for commentId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Comment updated",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedComment"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateCommentDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/media/upload": {
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Upload feed media files (images or videos)",
      "description": "Uploads up to 10 image or video files for feed posts or stories using multipart/form-data. Images (jpg, png, webp) max 10MB; videos (mp4, mov) max 50MB.",
      "parameters": [],
      "responses": {
        "200": {
          "description": "Uploaded media items with URLs and metadata",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/FeedMedia"
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "JSON service updates remain supported. Omit images to retain existing media.",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "categoryId": { "type": "string", "format": "uuid" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Admin scope selector; Vendors cannot change ownership." },
                "salonId": { "type": "string", "format": "uuid" },
                "branchId": { "type": "string", "format": "uuid" },
                "basePrice": { "type": "number" },
                "baseDuration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "images": { "type": "array", "items": { "type": "string" }, "description": "Existing URL or supported base64 image data." }
              }
            }
          },
          "multipart/form-data": {
            "schema": {
              "type": "object",
              "properties": {
                "media": {
                  "type": "array",
                  "items": {
                    "type": "string",
                    "format": "binary"
                  },
                  "description": "Up to 10 image or video files"
                }
              },
              "required": [
                "media"
              ]
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts": {
    "get": {
      "tags": [
        "Feed"
      ],
      "summary": "List feed posts",
      "description": "Fetches paginated social feed posts for the authenticated user and salon with likes, comments, and media.",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page (max 50)"
        },
        {
          "name": "salonId",
          "in": "query",
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "description": "Filter posts by salon UUID"
        },
        {
          "name": "branchId",
          "in": "query",
          "schema": {
            "type": "string",
            "format": "uuid"
          },
          "description": "Filter posts by branch UUID"
        },
        {
          "name": "status",
          "in": "query",
          "schema": {
            "type": "string",
            "enum": [
              "DRAFT",
              "PUBLISHED",
              "ARCHIVED"
            ]
          },
          "description": "Post status filter"
        },
        {
          "name": "search",
          "in": "query",
          "schema": {
            "type": "string"
          },
          "description": "Search keywords in captions"
        }
      ],
      "responses": {
        "200": {
          "description": "Paginated list of feed posts",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "posts": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/FeedPost"
                        }
                      },
                      "meta": {
                        "$ref": "#/components/schemas/Pagination"
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Create a new feed post",
      "description": "Publishes a new salon feed post with optional images or videos, caption, visibility setting, and status.",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Post created successfully",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedPost"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreatePostDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}": {
    "delete": {
      "tags": [
        "Feed"
      ],
      "summary": "DELETE /api/v1/feed/posts/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/feed/posts/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "Feed"
      ],
      "summary": "Get feed post by ID",
      "description": "Retrieves complete details of a feed post including author, media, like count, comment count, and user like status.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Feed post details",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedPost"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Feed"
      ],
      "summary": "Update feed post",
      "description": "Updates caption, visibility, status, or media of an existing owned post.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Updated feed post",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedPost"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreatePostDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}/archive": {
    "patch": {
      "tags": [
        "Feed"
      ],
      "summary": "Archive feed post",
      "description": "Sets post status to ARCHIVED, hiding it from public feed views.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Post archived",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Post archived successfully"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/feed/posts/:id/archive"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}/comments": {
    "get": {
      "tags": [
        "Feed"
      ],
      "summary": "List comments for post",
      "description": "Returns all user comments on the post sorted in chronological order.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "List of comments",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/FeedComment"
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Add comment to post",
      "description": "Creates a new text comment on the post from the authenticated user.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Comment created",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedComment"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateCommentDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}/like": {
    "delete": {
      "tags": [
        "Feed"
      ],
      "summary": "Unlike a feed post",
      "description": "Removes the authenticated user's like from the post.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Post unliked",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "liked": {
                        "type": "boolean",
                        "example": false
                      },
                      "likeCount": {
                        "type": "integer",
                        "example": 24
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Like a feed post",
      "description": "Adds a like from the authenticated user to the post.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Post liked",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "liked": {
                        "type": "boolean",
                        "example": true
                      },
                      "likeCount": {
                        "type": "integer",
                        "example": 25
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/feed/posts/:id/like"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}/report": {
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Report post for content moderation",
      "description": "Flags an inappropriate post for admin review.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Report submitted",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Report submitted successfully"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ReportPostDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}/share": {
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Record post share event",
      "description": "Logs that the user shared the post to a specified platform (WhatsApp, Instagram, etc.).",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Share recorded",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "shared": {
                        "type": "boolean",
                        "example": true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/SharePostDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/posts/{id}/view": {
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Record post view impression",
      "description": "Increments the view count on the specified post.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "View recorded",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "viewed": {
                        "type": "boolean",
                        "example": true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/feed/posts/:id/view"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/stories": {
    "get": {
      "tags": [
        "Feed"
      ],
      "summary": "List active 24-hour stories",
      "description": "Fetches active stories published within the last 24 hours grouped by salon.",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "List of active stories",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/FeedStory"
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Create 24-hour story",
      "description": "Publishes an ephemeral 24-hour photo or video story for the salon.",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Story created",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedStory"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateStoryDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/stories/{id}": {
    "put": {
      "tags": [
        "Feed"
      ],
      "summary": "Update story",
      "description": "Updates a story owned by the authenticated user, or allows admin/super-admin to update any story.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Story updated",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedStory"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateStoryDto"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "delete": {
      "tags": [
        "Feed"
      ],
      "summary": "Delete story",
      "description": "Removes a story before its 24-hour natural expiry.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Story deleted",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Story deleted"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "Feed"
      ],
      "summary": "Get story by ID",
      "description": "Retrieves a single active story and its media.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Story details",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "$ref": "#/components/schemas/FeedStory"
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/feed/stories/{id}/view": {
    "post": {
      "tags": [
        "Feed"
      ],
      "summary": "Record view on story",
      "description": "Marks that the authenticated user viewed this story.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Story view recorded",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "data": {
                    "type": "object",
                    "properties": {
                      "viewed": {
                        "type": "boolean",
                        "example": true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/feed/stories/:id/view"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/generate/image": {
    "post": {
      "tags": [
        "Generative AI"
      ],
      "summary": "Generate and preview a service or combo image",
      "description": "Requires services.ai-image.generate in effective RBAC and subscription entitlements. Vendors additionally need the Admin-assigned AI image access flag. Generated images are returned for preview and are not automatically attached.",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": ["prompt"],
              "properties": {
                "prompt": { "type": "string", "minLength": 5 },
                "serviceId": { "type": "string", "format": "uuid", "description": "Optional target Service; Vendors may target only their own salon/branch." },
                "comboId": { "type": "string", "format": "uuid", "description": "Optional target Combo; Vendors may target only their own salon/branch." }
              },
              "description": "Specify serviceId or comboId (not both) to enforce resource ownership before generation."
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/gst/booking/{bookingId}": {
    "get": {
      "tags": [
        "GST"
      ],
      "summary": "GET /api/v1/gst/booking/{bookingId}",
      "description": "Handles GET request for endpoint /api/v1/gst/booking/:bookingId",
      "parameters": [
        {
          "name": "bookingId",
          "in": "path",
          "required": true,
          "description": "ID parameter for bookingId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "AI_IMAGE_ACCESS_DENIED or AI_IMAGE_TARGET_ACCESS_DENIED",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/gst/config/{salonId}": {
    "get": {
      "tags": [
        "GST"
      ],
      "summary": "GET /api/v1/gst/config/{salonId}",
      "description": "Handles GET request for endpoint /api/v1/gst/config/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "GST"
      ],
      "summary": "PUT /api/v1/gst/config/{salonId}",
      "description": "Handles PUT request for endpoint /api/v1/gst/config/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/gst/config/:salonId"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/gst/print/{bookingId}": {
    "get": {
      "tags": [
        "GST"
      ],
      "summary": "GET /api/v1/gst/print/{bookingId}",
      "description": "Handles GET request for endpoint /api/v1/gst/print/:bookingId",
      "parameters": [
        {
          "name": "bookingId",
          "in": "path",
          "required": true,
          "description": "ID parameter for bookingId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/branches/{branchId}/products": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/branches/{branchId}/products",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/branches/:branchId/products",
      "parameters": [
        {
          "name": "branchId",
          "in": "path",
          "required": true,
          "description": "ID parameter for branchId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/dashboard-stats": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/dashboard-stats",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/dashboard-stats",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/listings/{id}/approval": {
    "patch": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "PATCH /api/v1/inventory/admin/listings/{id}/approval",
      "description": "Handles PATCH request for endpoint /api/v1/inventory/admin/listings/:id/approval",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/inventory/admin/listings/:id/approval"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/low-stock": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/low-stock",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/low-stock",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/product-stats/{type}": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/product-stats/{type}",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/product-stats/:type",
      "parameters": [
        {
          "name": "type",
          "in": "path",
          "required": true,
          "description": "ID parameter for type",
          "schema": {
            "type": "string",
            "format": "string"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/products": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/products",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/products",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/products/{id}": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/products/{id}",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/products/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/salons/{salonId}/products": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/salons/{salonId}/products",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/salons/:salonId/products",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/admin/vendors/{vendorId}/products": {
    "get": {
      "tags": [
        "Inventory - Admin"
      ],
      "summary": "GET /api/v1/inventory/admin/vendors/{vendorId}/products",
      "description": "Handles GET request for endpoint /api/v1/inventory/admin/vendors/:vendorId/products",
      "parameters": [
        {
          "name": "vendorId",
          "in": "path",
          "required": true,
          "description": "ID parameter for vendorId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/brands": {
    "get": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "GET /api/v1/inventory/brands",
      "description": "Handles GET request for endpoint /api/v1/inventory/brands",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "POST /api/v1/inventory/brands",
      "description": "Handles POST request for endpoint /api/v1/inventory/brands",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/inventory/brands"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/brands/{id}": {
    "delete": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "DELETE /api/v1/inventory/brands/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/inventory/brands/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "PUT /api/v1/inventory/brands/{id}",
      "description": "Handles PUT request for endpoint /api/v1/inventory/brands/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/inventory/brands/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/categories": {
    "get": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "GET /api/v1/inventory/categories",
      "description": "Handles GET request for endpoint /api/v1/inventory/categories",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "POST /api/v1/inventory/categories",
      "description": "Handles POST request for endpoint /api/v1/inventory/categories",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/inventory/categories"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/categories/{id}": {
    "delete": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "DELETE /api/v1/inventory/categories/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/inventory/categories/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "GET /api/v1/inventory/categories/{id}",
      "description": "Handles GET request for endpoint /api/v1/inventory/categories/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Inventory - Catalog"
      ],
      "summary": "PUT /api/v1/inventory/categories/{id}",
      "description": "Handles PUT request for endpoint /api/v1/inventory/categories/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/inventory/categories/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/salon/products": {
    "get": {
      "tags": [
        "Inventory - Salon"
      ],
      "summary": "GET /api/v1/inventory/salon/products",
      "description": "Handles GET request for endpoint /api/v1/inventory/salon/products",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/salon/stock": {
    "get": {
      "tags": [
        "Inventory - Salon"
      ],
      "summary": "GET /api/v1/inventory/salon/stock",
      "description": "Handles GET request for endpoint /api/v1/inventory/salon/stock",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Inventory - Salon"
      ],
      "summary": "POST /api/v1/inventory/salon/stock",
      "description": "Handles POST request for endpoint /api/v1/inventory/salon/stock",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/inventory/salon/stock"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/salon/stock/{id}": {
    "delete": {
      "tags": [
        "Inventory - Salon"
      ],
      "summary": "DELETE /api/v1/inventory/salon/stock/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/inventory/salon/stock/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Inventory - Salon"
      ],
      "summary": "PUT /api/v1/inventory/salon/stock/{id}",
      "description": "Handles PUT request for endpoint /api/v1/inventory/salon/stock/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/inventory/salon/stock/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/vendor/product-stats": {
    "get": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "GET /api/v1/inventory/vendor/product-stats",
      "description": "Handles GET request for endpoint /api/v1/inventory/vendor/product-stats",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/vendor/products": {
    "get": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "GET /api/v1/inventory/vendor/products",
      "description": "Handles GET request for endpoint /api/v1/inventory/vendor/products",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "POST /api/v1/inventory/vendor/products",
      "description": "Handles POST request for endpoint /api/v1/inventory/vendor/products",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/inventory/vendor/products"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/vendor/products/{id}": {
    "delete": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "DELETE /api/v1/inventory/vendor/products/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/inventory/vendor/products/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "GET /api/v1/inventory/vendor/products/{id}",
      "description": "Handles GET request for endpoint /api/v1/inventory/vendor/products/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "PUT /api/v1/inventory/vendor/products/{id}",
      "description": "Handles PUT request for endpoint /api/v1/inventory/vendor/products/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/inventory/vendor/products/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/vendor/products/{id}/status": {
    "patch": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "PATCH /api/v1/inventory/vendor/products/{id}/status",
      "description": "Handles PATCH request for endpoint /api/v1/inventory/vendor/products/:id/status",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/inventory/vendor/products/:id/status"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/vendor/products/images": {
    "post": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "POST /api/v1/inventory/vendor/products/images",
      "description": "Handles POST request for endpoint /api/v1/inventory/vendor/products/images",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/inventory/vendor/products/images"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/inventory/vendor/stock": {
    "get": {
      "tags": [
        "Inventory - Vendor"
      ],
      "summary": "GET /api/v1/inventory/vendor/stock",
      "description": "Handles GET request for endpoint /api/v1/inventory/vendor/stock",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/leads": {
    "get": {
      "tags": [
        "Leads"
      ],
      "summary": "GET /api/v1/leads",
      "description": "Handles GET request for endpoint /api/v1/leads",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      }
    },
    "post": {
      "tags": [
        "Leads"
      ],
      "summary": "POST /api/v1/leads",
      "description": "Handles POST request for endpoint /api/v1/leads",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/leads"
            }
          }
        }
      }
    }
  },
  "/api/v1/leads/{id}/status": {
    "patch": {
      "tags": [
        "Leads"
      ],
      "summary": "PATCH /api/v1/leads/{id}/status",
      "description": "Handles PATCH request for endpoint /api/v1/leads/:id/status",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/leads/:id/status"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/master/countries": {
    "get": {
      "tags": [
        "Master Data"
      ],
      "summary": "GET /api/v1/master/countries",
      "description": "Handles GET request for endpoint /api/v1/master/countries",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      }
    }
  },
  "/api/v1/master/countries/{countryId}/states": {
    "get": {
      "tags": [
        "Master Data"
      ],
      "summary": "GET /api/v1/master/countries/{countryId}/states",
      "description": "Handles GET request for endpoint /api/v1/master/countries/:countryId/states",
      "parameters": [
        {
          "name": "countryId",
          "in": "path",
          "required": true,
          "description": "ID parameter for countryId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      }
    }
  },
  "/api/v1/master/states/{stateId}/cities": {
    "get": {
      "tags": [
        "Master Data"
      ],
      "summary": "GET /api/v1/master/states/{stateId}/cities",
      "description": "Handles GET request for endpoint /api/v1/master/states/:stateId/cities",
      "parameters": [
        {
          "name": "stateId",
          "in": "path",
          "required": true,
          "description": "ID parameter for stateId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      }
    }
  },
  "/api/v1/me": {
    "get": {
      "tags": [
        "Users"
      ],
      "summary": "GET /api/v1/me",
      "description": "Handles GET request for endpoint /api/v1/me",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/menus": {
    "get": {
      "tags": [
        "RBAC"
      ],
      "summary": "Get the authenticated user's effective menu tree",
      "description": "Menus are filtered by effective role permissions and, for vendors and staff, active subscription entitlements, including enabled subscription features such as payment_wallet. A parent is included when it is authorized or at least one child is authorized. Each node includes its existing menuPermissions metadata. The response uses the project's existing label/path/menuPermissions/children shape.",
      "parameters": [
        {
          "name": "sidebarOnly",
          "in": "query",
          "required": false,
          "schema": {
            "type": "boolean",
            "default": true
          },
          "description": "When true, omit menus hidden from the sidebar."
        },
        {
          "name": "fetchAll",
          "in": "query",
          "required": false,
          "schema": {
            "type": "boolean",
            "default": false
          },
          "description": "Return the full menu tree for access-control management; only administrators may request this."
        }
      ],
      "responses": {
        "200": {
          "description": "Authenticated menu tree filtered by role permissions and applicable subscription entitlements",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/RbacMenusResponse"
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "RBAC"
      ],
      "summary": "POST /api/v1/rbac/menus",
      "description": "Handles POST request for endpoint /api/v1/rbac/menus",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/rbac/menus"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/menus/{id}": {
    "delete": {
      "tags": [
        "RBAC"
      ],
      "summary": "DELETE /api/v1/rbac/menus/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/rbac/menus/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "RBAC"
      ],
      "summary": "PUT /api/v1/rbac/menus/{id}",
      "description": "Handles PUT request for endpoint /api/v1/rbac/menus/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/rbac/menus/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/menus/reorder": {
    "put": {
      "tags": [
        "RBAC"
      ],
      "summary": "PUT /api/v1/rbac/menus/reorder",
      "description": "Handles PUT request for endpoint /api/v1/rbac/menus/reorder",
      "parameters": [],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/rbac/menus/reorder"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/permissions": {
    "get": {
      "tags": [
        "RBAC"
      ],
      "summary": "GET /api/v1/rbac/permissions",
      "description": "Handles GET request for endpoint /api/v1/rbac/permissions",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/permissions/me": {
    "get": {
      "tags": [
        "RBAC"
      ],
      "summary": "GET /api/v1/rbac/permissions/me",
      "description": "Handles GET request for endpoint /api/v1/rbac/permissions/me",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/roles/{id}/permissions": {
    "get": {
      "tags": [
        "RBAC"
      ],
      "summary": "GET /api/v1/rbac/roles/{id}/permissions",
      "description": "Handles GET request for endpoint /api/v1/rbac/roles/:id/permissions",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/roles/{id}/permissions/toggle": {
    "post": {
      "tags": [
        "RBAC"
      ],
      "summary": "POST /api/v1/rbac/roles/{id}/permissions/toggle",
      "description": "Handles POST request for endpoint /api/v1/rbac/roles/:id/permissions/toggle",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/rbac/roles/:id/permissions/toggle"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/staff-roles": {
    "get": {
      "tags": [
        "RBAC"
      ],
      "summary": "GET /api/v1/rbac/staff-roles",
      "description": "Handles GET request for endpoint /api/v1/rbac/staff-roles",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "RBAC"
      ],
      "summary": "POST /api/v1/rbac/staff-roles",
      "description": "Handles POST request for endpoint /api/v1/rbac/staff-roles",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/rbac/staff-roles"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/rbac/staff-roles/{id}": {
    "delete": {
      "tags": [
        "RBAC"
      ],
      "summary": "DELETE /api/v1/rbac/staff-roles/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/rbac/staff-roles/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "RBAC"
      ],
      "summary": "PUT /api/v1/rbac/staff-roles/{id}",
      "description": "Handles PUT request for endpoint /api/v1/rbac/staff-roles/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/rbac/staff-roles/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/salons": {
    "post": {
      "tags": [
        "Salons"
      ],
      "summary": "POST /api/v1/salons",
      "description": "Handles POST request for endpoint /api/v1/salons",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/salons"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/salons/{id}": {
    "get": {
      "tags": [
        "Salons"
      ],
      "summary": "GET /api/v1/salons/{id}",
      "description": "Handles GET request for endpoint /api/v1/salons/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/salons/{id}/branches": {
    "get": {
      "tags": [
        "Salons"
      ],
      "summary": "GET /api/v1/salons/{id}/branches",
      "description": "Handles GET request for endpoint /api/v1/salons/:id/branches",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Salons"
      ],
      "summary": "POST /api/v1/salons/{id}/branches",
      "description": "Handles POST request for endpoint /api/v1/salons/:id/branches",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/salons/:id/branches"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/salons/my": {
    "get": {
      "tags": [
        "Salons"
      ],
      "summary": "GET /api/v1/salons/my",
      "description": "Handles GET request for endpoint /api/v1/salons/my",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/services": {
    "get": {
      "tags": ["Services"],
      "summary": "List services",
      "description": "Lists active services available to the caller by default. Administrators may filter by Vendor, Salon, and Branch; Vendors are always restricted to their own authorized salon network.",
      "parameters": [
        { "name": "vendorId", "in": "query", "schema": { "type": "string", "format": "uuid" } },
        { "name": "salonId", "in": "query", "schema": { "type": "string", "format": "uuid" } },
        { "name": "branchId", "in": "query", "schema": { "type": "string", "format": "uuid" } },
        { "name": "categoryId", "in": "query", "schema": { "type": "string", "format": "uuid" } },
        { "name": "status", "in": "query", "schema": { "type": "string", "enum": ["active", "inactive"] } },
        { "name": "search", "in": "query", "schema": { "type": "string" } },
        { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
        { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 10, "maximum": 100 } }
      ],
      "responses": {
        "200": { "description": "Paginated scoped service records, including images and salon/branch ownership context" },
        "401": { "description": "Unauthorized" },
        "403": { "description": "Filter is outside the caller's authorized scope" }
      },
      "security": [{ "bearerAuth": [] }]
    }
  },
  "/api/v1/services/{id}": {
    "get": {
      "tags": ["Services"],
      "summary": "Get service details",
      "description": "Returns service, image, category, salon, branch, and Vendor context. Vendors can access only their own authorized services.",
      "parameters": [{
        "name": "id",
        "in": "path",
        "required": true,
        "schema": { "type": "string", "format": "uuid" }
      }],
      "responses": {
        "200": { "description": "Service details, including ownership scope and images" },
        "401": { "description": "Unauthorized" },
        "403": { "description": "Service is outside the caller's authorized scope" },
        "404": { "description": "Service not found" }
      },
      "security": [{ "bearerAuth": [] }]
    },
    "patch": {
      "tags": [
        "Services"
      ],
      "summary": "PATCH /api/v1/services/{id}",
      "description": "Handles PATCH request for endpoint /api/v1/services/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "JSON service updates remain supported. Omit images to retain existing media.",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "categoryId": { "type": "string", "format": "uuid" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Vendor selector for Admin requests; Vendor identity is derived from authentication." },
                "salonId": { "type": "string", "format": "uuid", "description": "Main salon within the selected Vendor." },
                "branchId": { "type": "string", "format": "uuid", "description": "Optional branch; omitted means salon-level service." },
                "basePrice": { "type": "number" },
                "baseDuration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "images": { "type": "array", "items": { "type": "string" }, "description": "Existing URL or supported base64 image data." }
              }
            }
          },
          "multipart/form-data": {
            "schema": {
              "type": "object",
              "description": "Optional service fields and optional replacement image. Existing image is retained when image is omitted.",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "categoryId": { "type": "string", "format": "uuid" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Admin scope selector; Vendors cannot change ownership." },
                "salonId": { "type": "string", "format": "uuid", "description": "Main salon within the selected Vendor." },
                "branchId": { "type": "string", "format": "uuid", "description": "Optional branch; omitted means salon-level service." },
                "basePrice": { "type": "number" },
                "baseDuration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "image": { "type": "string", "format": "binary", "description": "JPEG, PNG, WEBP, or GIF, maximum 10 MB." }
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "delete": {
      "tags": [
        "Services"
      ],
      "summary": "Delete service",
      "description": "Soft-deactivates a service owned by the authenticated vendor or managed by an administrator. Booking history and service identifiers are preserved.",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "Service UUID",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": { "description": "Service deleted successfully" },
        "401": { "description": "Unauthorized" },
        "403": { "description": "Forbidden" },
        "404": { "description": "Service not found" }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/services/lookups/{type}": {
    "get": {
      "tags": ["Services"],
      "summary": "Search service ownership selectors",
      "description": "Returns paginated active Vendor, Salon, or Branch options. Administrators must provide vendorId when requesting salons and salonId when requesting branches. Vendors are scoped to their own salons and branches.",
      "parameters": [
        {
          "name": "type",
          "in": "path",
          "required": true,
          "schema": { "type": "string", "enum": ["vendors", "salons", "branches"] }
        },
        { "name": "search", "in": "query", "schema": { "type": "string" } },
        { "name": "vendorId", "in": "query", "schema": { "type": "string", "format": "uuid" } },
        { "name": "salonId", "in": "query", "schema": { "type": "string", "format": "uuid" } },
        { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
        { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 20, "maximum": 100 } }
      ],
      "responses": {
        "200": { "description": "Paginated selector options" },
        "400": { "description": "Missing or invalid dependency selector" },
        "401": { "description": "Unauthorized" },
        "403": { "description": "Selection is outside the caller's authorized scope" }
      },
      "security": [{ "bearerAuth": [] }]
    }
  },
  "/api/v1/services/categories": {
    "get": {
      "tags": [
        "Services"
      ],
      "summary": "GET /api/v1/services/categories",
      "description": "Handles GET request for endpoint /api/v1/services/categories",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Services"
      ],
      "summary": "POST /api/v1/services/categories",
      "description": "Handles POST request for endpoint /api/v1/services/categories",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/services/categories"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/services/categories/{id}": {
    "patch": {
      "tags": [
        "Services"
      ],
      "summary": "PATCH /api/v1/services/categories/{id}",
      "description": "Handles PATCH request for endpoint /api/v1/services/categories/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/services/categories/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/services/combos/{id}": {
    "patch": {
      "tags": [
        "Services"
      ],
      "summary": "PATCH /api/v1/services/combos/{id}",
      "description": "Handles PATCH request for endpoint /api/v1/services/combos/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Combo fields and optional imageUrl (including an AI-generated preview selected by the user). Omit imageUrl to keep the current image. Admin may move a Combo using a validated Vendor, Salon, and optional Branch; Vendor identity is derived from authentication.",
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Vendor selector for Admin requests; Vendors cannot transfer ownership." },
                "salonId": { "type": "string", "format": "uuid", "description": "Main salon within the selected Vendor." },
                "branchId": { "type": "string", "format": "uuid", "description": "Optional branch belonging to the selected Salon." },
                "price": { "type": "number" },
                "duration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "imageUrl": { "type": "string" },
                "serviceIds": { "type": "array", "items": { "type": "string", "format": "uuid" } }
              }
            }
          },
          "multipart/form-data": {
            "schema": {
              "type": "object",
              "description": "Optional location updates plus replacement manual image upload. Ownership selections are checked server-side.",
              "properties": {
                "vendorId": { "type": "string", "format": "uuid", "description": "Admin only; Vendor identity is derived from authentication for Vendors." },
                "salonId": { "type": "string", "format": "uuid" },
                "branchId": { "type": "string", "format": "uuid" },
                "image": { "type": "string", "format": "binary", "description": "JPEG, PNG, WEBP, or GIF up to 10 MB." }
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/services/salon/{salonId}": {
    "get": {
      "tags": [
        "Services"
      ],
      "summary": "GET /api/v1/services/salon/{salonId}",
      "description": "Handles GET request for endpoint /api/v1/services/salon/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Services"
      ],
      "summary": "POST /api/v1/services/salon/{salonId}",
      "description": "Handles POST request for endpoint /api/v1/services/salon/:salonId",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "JSON service creation remains supported, including the existing images array.",
              "required": ["name", "categoryId", "basePrice", "baseDuration"],
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "categoryId": { "type": "string", "format": "uuid" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Vendor selector for Admin requests; Vendor identity is derived from authentication." },
                "salonId": { "type": "string", "format": "uuid" },
                "branchId": { "type": "string", "format": "uuid" },
                "basePrice": { "type": "number" },
                "baseDuration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "images": { "type": "array", "items": { "type": "string" }, "description": "Existing URL or supported base64 image data." }
              }
            }
          },
          "multipart/form-data": {
            "schema": {
              "type": "object",
              "description": "Create a service at salon level or at an optional branch within the selected Vendor. The branch must belong to the salon, and the salon must belong to the Vendor.",
              "required": ["name", "categoryId", "basePrice", "baseDuration"],
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "categoryId": { "type": "string", "format": "uuid" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Vendor selector for Admin requests; Vendor identity is derived from authentication." },
                "salonId": { "type": "string", "format": "uuid", "description": "Optional; if provided, must match the salon path and selected Vendor." },
                "branchId": { "type": "string", "format": "uuid", "description": "Optional; omission preserves salon-level services." },
                "basePrice": { "type": "number" },
                "baseDuration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "image": { "type": "string", "format": "binary", "description": "Optional JPEG, PNG, WEBP, or GIF, maximum 10 MB." }
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/services/salon/{salonId}/combos": {
    "get": {
      "tags": [
        "Services"
      ],
      "summary": "GET /api/v1/services/salon/{salonId}/combos",
      "description": "Handles GET request for endpoint /api/v1/services/salon/:salonId/combos",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Services"
      ],
      "summary": "POST /api/v1/services/salon/{salonId}/combos",
      "description": "Handles POST request for endpoint /api/v1/services/salon/:salonId/combos",
      "parameters": [
        {
          "name": "salonId",
          "in": "path",
          "required": true,
          "description": "ID parameter for salonId",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": ["name", "price", "duration", "serviceIds"],
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Vendor selector for Admin requests; Vendor identity is derived from authentication." },
                "salonId": { "type": "string", "format": "uuid", "description": "Main salon within the selected Vendor." },
                "branchId": { "type": "string", "format": "uuid", "description": "Optional branch belonging to the selected Salon." },
                "price": { "type": "number" },
                "duration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "imageUrl": { "type": "string", "description": "An existing image URL, including an AI-generated image selected after preview." },
                "serviceIds": { "type": "array", "items": { "type": "string", "format": "uuid" } }
              }
            }
          },
          "multipart/form-data": {
            "schema": {
              "type": "object",
              "required": ["name", "price", "duration", "serviceIds"],
              "properties": {
                "name": { "type": "string" },
                "description": { "type": "string" },
                "vendorId": { "type": "string", "format": "uuid", "description": "Optional Vendor selector for Admin requests; Vendor identity is derived from authentication." },
                "salonId": { "type": "string", "format": "uuid", "description": "Main salon within the selected Vendor." },
                "branchId": { "type": "string", "format": "uuid", "description": "Optional branch belonging to the selected Salon." },
                "price": { "type": "number" },
                "duration": { "type": "integer" },
                "isActive": { "type": "boolean" },
                "image": { "type": "string", "format": "binary", "description": "Optional JPEG, PNG, WEBP, or GIF up to 10 MB." }
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/staff": {
    "get": {
      "tags": [
        "Staff"
      ],
      "summary": "GET /api/v1/staff",
      "description": "Handles GET request for endpoint /api/v1/staff",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Staff"
      ],
      "summary": "POST /api/v1/staff",
      "description": "Handles POST request for endpoint /api/v1/staff",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/staff"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/staff/{id}": {
    "patch": {
      "tags": [
        "Staff"
      ],
      "summary": "PATCH /api/v1/staff/{id}",
      "description": "Handles PATCH request for endpoint /api/v1/staff/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/staff/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/staff/attendance": {
    "get": {
      "tags": [
        "Staff"
      ],
      "summary": "GET /api/v1/staff/attendance",
      "description": "Handles GET request for endpoint /api/v1/staff/attendance",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "Staff"
      ],
      "summary": "POST /api/v1/staff/attendance",
      "description": "Handles POST request for endpoint /api/v1/staff/attendance",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/staff/attendance"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/staff/me/attendance": {
    "get": {
      "tags": [
        "Staff"
      ],
      "summary": "GET /api/v1/staff/me/attendance",
      "description": "Handles GET request for endpoint /api/v1/staff/me/attendance",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/upload": {
    "post": {
      "tags": [
        "Upload"
      ],
      "summary": "POST /api/v1/upload",
      "description": "Handles POST request for endpoint /api/v1/upload",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/upload"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/users/my-salon": {
    "get": {
      "tags": [
        "Users"
      ],
      "summary": "GET /api/v1/users/my-salon",
      "description": "Handles GET request for endpoint /api/v1/users/my-salon",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "patch": {
      "tags": [
        "Users"
      ],
      "summary": "PATCH /api/v1/users/my-salon",
      "description": "Handles PATCH request for endpoint /api/v1/users/my-salon",
      "parameters": [],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/users/my-salon"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/users/my-salons": {
    "get": {
      "tags": [
        "Users"
      ],
      "summary": "GET /api/v1/users/my-salons",
      "description": "Handles GET request for endpoint /api/v1/users/my-salons",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/users/profile": {
    "patch": {
      "tags": [
        "Users"
      ],
      "summary": "PATCH /api/v1/users/profile",
      "description": "Handles PATCH request for endpoint /api/v1/users/profile",
      "parameters": [],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PATCH /api/v1/users/profile"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/users/profile/completion": {
    "get": {
      "tags": [
        "Users"
      ],
      "summary": "GET /api/v1/users/profile/completion",
      "description": "Handles GET request for endpoint /api/v1/users/profile/completion",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/campaigns",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/campaigns",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/campaigns/{id}",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/campaigns/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "PUT /api/v1/whatsapp/campaigns/{id}",
      "description": "Handles PUT request for endpoint /api/v1/whatsapp/campaigns/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/whatsapp/campaigns/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/cancel": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns/{id}/cancel",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns/:id/cancel",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns/:id/cancel"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/duplicate": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns/{id}/duplicate",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns/:id/duplicate",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns/:id/duplicate"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/pause": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns/{id}/pause",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns/:id/pause",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns/:id/pause"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/recipients": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/campaigns/{id}/recipients",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/campaigns/:id/recipients",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/resume": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns/{id}/resume",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns/:id/resume",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns/:id/resume"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/retry-failed": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns/{id}/retry-failed",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns/:id/retry-failed",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns/:id/retry-failed"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/send": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/campaigns/{id}/send",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/campaigns/:id/send",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/campaigns/:id/send"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/campaigns/{id}/stats": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/campaigns/{id}/stats",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/campaigns/:id/stats",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/connections": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/connections",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/connections",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/connections",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/connections",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/connections"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/connections/{id}": {
    "delete": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "DELETE /api/v1/whatsapp/connections/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/whatsapp/connections/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/connections/{id}",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/connections/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "PUT /api/v1/whatsapp/connections/{id}",
      "description": "Handles PUT request for endpoint /api/v1/whatsapp/connections/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/whatsapp/connections/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/connections/{id}/test": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/connections/{id}/test",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/connections/:id/test",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/connections/:id/test"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/contacts": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/contacts",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/contacts",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/contacts",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/contacts",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/contacts"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/contacts/{id}": {
    "delete": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "DELETE /api/v1/whatsapp/contacts/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/whatsapp/contacts/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/contacts/{id}",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/contacts/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "PUT /api/v1/whatsapp/contacts/{id}",
      "description": "Handles PUT request for endpoint /api/v1/whatsapp/contacts/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/whatsapp/contacts/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/contacts/{id}/opt-in": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/contacts/{id}/opt-in",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/contacts/:id/opt-in",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/contacts/:id/opt-in"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/contacts/{id}/opt-out": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/contacts/{id}/opt-out",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/contacts/:id/opt-out",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/contacts/:id/opt-out"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/contacts/import": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/contacts/import",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/contacts/import",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/contacts/import"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/dashboard": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/dashboard",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/dashboard",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/messages/send": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/messages/send",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/messages/send",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/messages/send"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/pricing/estimate": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/pricing/estimate",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/pricing/estimate",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/templates": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/templates",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/templates",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/templates",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/templates",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/templates"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/templates/{id}": {
    "delete": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "DELETE /api/v1/whatsapp/templates/{id}",
      "description": "Handles DELETE request for endpoint /api/v1/whatsapp/templates/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/templates/{id}",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/templates/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    },
    "put": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "PUT /api/v1/whatsapp/templates/{id}",
      "description": "Handles PUT request for endpoint /api/v1/whatsapp/templates/:id",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for PUT /api/v1/whatsapp/templates/:id"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/templates/{id}/submit": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/templates/{id}/submit",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/templates/:id/submit",
      "parameters": [
        {
          "name": "id",
          "in": "path",
          "required": true,
          "description": "ID parameter for id",
          "schema": {
            "type": "string",
            "format": "uuid"
          }
        }
      ],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "404": {
          "description": "Resource not found",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/templates/:id/submit"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/templates/sync": {
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/templates/sync",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/templates/sync",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        },
        "401": {
          "description": "Unauthorized - Missing or invalid JWT token",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        },
        "403": {
          "description": "Forbidden - Insufficient permissions or role",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Error"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/templates/sync"
            }
          }
        }
      },
      "security": [
        {
          "bearerAuth": []
        }
      ]
    }
  },
  "/api/v1/whatsapp/webhook": {
    "get": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "GET /api/v1/whatsapp/webhook",
      "description": "Handles GET request for endpoint /api/v1/whatsapp/webhook",
      "parameters": [
        {
          "name": "page",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 1
          },
          "description": "Page number"
        },
        {
          "name": "limit",
          "in": "query",
          "required": false,
          "schema": {
            "type": "integer",
            "default": 10
          },
          "description": "Items per page"
        },
        {
          "name": "search",
          "in": "query",
          "required": false,
          "schema": {
            "type": "string"
          },
          "description": "Search term"
        }
      ],
      "responses": {
        "200": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      }
    },
    "post": {
      "tags": [
        "WhatsApp"
      ],
      "summary": "POST /api/v1/whatsapp/webhook",
      "description": "Handles POST request for endpoint /api/v1/whatsapp/webhook",
      "parameters": [],
      "responses": {
        "201": {
          "description": "Successful operation",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "success": {
                    "type": "boolean",
                    "example": true
                  },
                  "message": {
                    "type": "string",
                    "example": "Operation completed successfully"
                  },
                  "data": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "400": {
          "description": "Validation or client error",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ValidationError"
              }
            }
          }
        }
      },
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "description": "Payload for POST /api/v1/whatsapp/webhook"
            }
          }
        }
      }
    }
  }
};

const bearer = [{ bearerAuth: [] }];
const ok = { description: "Successful operation" };
const errors = { "400": { description: "Validation error" }, "401": { description: "Unauthorized" }, "403": { description: "Forbidden" }, "404": { description: "Not found" } };
const jsonBody = (schema: any) => ({ required: true, content: { "application/json": { schema } } });
const idParam = { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const subscriptionResponse = { type: "object", properties: { success: { type: "boolean", example: true }, data: { type: "object" } } };

const adminFeedListParameters = [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
  { name: "search", in: "query", schema: { type: "string" } },
  { name: "countryId", in: "query", schema: { type: "string" } },
  { name: "cityId", in: "query", schema: { type: "string" } },
  { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "branchId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "staffId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "EXPIRED", "DRAFT", "PUBLISHED", "ARCHIVED", "DELETED", "REJECTED"] } },
  { name: "fromDate", in: "query", schema: { type: "string", format: "date-time" } },
  { name: "toDate", in: "query", schema: { type: "string", format: "date-time" } },
];

Object.assign(openapiPaths, {
  "/api/v1/bookings/lookups/{type}": {
    get: {
      tags: ["Bookings"],
      summary: "Search booking Vendor, Salon, and Branch selectors",
      description: "Uses existing paginated location lookups. Admin selects Vendor then Salon then Branch; Vendors see only locations under their authenticated account.",
      security: bearer,
      parameters: [
        { name: "type", in: "path", required: true, schema: { type: "string", enum: ["vendors", "salons", "branches"] } },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
      ],
      responses: { "200": ok, ...errors },
    },
  },
  "/api/v1/vendor/me/payment-gateway/razorpay": { get: { tags: ["Vendor"], summary: "Get own vendor Razorpay configuration", description: "Returns configuration state for the authenticated vendor only. Secrets are never returned.", security: bearer, responses: { "200": ok, ...errors } }, put: { tags: ["Vendor"], summary: "Save own vendor Razorpay configuration", description: "Saves TEST or LIVE credentials for the authenticated vendor. Blank secrets preserve existing encrypted values.", security: bearer, requestBody: jsonBody({ type: "object", required: ["environment", "keyId", "enabled"], properties: { environment: { type: "string", enum: ["TEST", "LIVE"] }, keyId: { type: "string" }, keySecret: { type: "string", writeOnly: true }, webhookSecret: { type: "string", writeOnly: true }, enabled: { type: "boolean" } } }), responses: { "200": ok, "400": { description: "Validation or missing secret" }, "401": { description: "Unauthorized" }, "403": { description: "Vendor permission denied" }, "503": { description: "Gateway unavailable" } } } },
  "/api/v1/vendor/me/payment-gateway/razorpay/test": { post: { tags: ["Vendor"], summary: "Test own vendor Razorpay connection", security: bearer, responses: { "200": ok, "401": { description: "Unauthorized" }, "403": { description: "Vendor permission denied" }, "503": { description: "Razorpay connection failed" } } } },
  "/api/v1/admin/payment-gateway/razorpay": { get: { tags: ["Admin"], summary: "Get platform Razorpay configuration state", description: "Returns platform configuration state without secrets. Requires `payment-gateway.view` or admin role.", security: bearer, responses: { "200": ok, ...errors } }, put: { tags: ["Admin"], summary: "Update platform Razorpay configuration", description: "Stores encrypted platform credentials. Blank secrets preserve existing values.", security: bearer, requestBody: jsonBody({ type: "object", required: ["environment", "keyId", "enabled"], properties: { environment: { type: "string", enum: ["TEST", "LIVE"] }, keyId: { type: "string" }, keySecret: { type: "string", writeOnly: true }, webhookSecret: { type: "string", writeOnly: true }, enabled: { type: "boolean" } } }), responses: { "200": ok, ...errors, "503": { description: "Gateway unavailable" } } } },
  "/api/v1/admin/payment-gateway/razorpay/test": { post: { tags: ["Admin"], summary: "Test platform Razorpay connection", security: bearer, responses: { "200": ok, ...errors, "503": { description: "Razorpay connection failed" } } } },
  "/api/v1/rbac/roles/{id}/permissions": { get: { tags: ["RBAC"], summary: "Get role permissions", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } }, put: { tags: ["RBAC"], summary: "Replace one role's permissions", description: "Replaces only the selected role's permission assignments in a transaction.", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", required: ["permissions"], properties: { permissions: { type: "array", items: { type: "string" } } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/bookings/{id}/payments/verify-razorpay": { post: { tags: ["Bookings"], summary: "Verify a Razorpay booking payment", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", required: ["razorpayOrderId", "razorpayPaymentId", "razorpaySignature"], properties: { razorpayOrderId: { type: "string" }, razorpayPaymentId: { type: "string" }, razorpaySignature: { type: "string", writeOnly: true } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/feed/posts/{id}/share": { post: { tags: ["Feed"], summary: "Record a post share", description: "Records one share event for an actual share action and returns the stable canonical URL for the post. Opening a share dialog does not call this endpoint.", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", properties: { platform: { type: "string", enum: ["NATIVE", "COPY_LINK", "WHATSAPP", "FACEBOOK", "X", "LINKEDIN", "INSTAGRAM", "OTHER"], default: "COPY_LINK" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/admin/feed/posts": { get: { tags: ["Admin"], summary: "List Feed posts across all vendors", security: bearer, parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "branchId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "startDate", in: "query", schema: { type: "string", format: "date-time" } }, { name: "endDate", in: "query", schema: { type: "string", format: "date-time" } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { "200": ok, ...errors } } },
  "/api/v1/admin/feed/stories": { get: { tags: ["Admin"], summary: "List Feed stories across all vendors", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/admin/feed/reports": { get: { tags: ["Admin"], summary: "List Feed reports", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/admin/posts/{id}": { get: { tags: ["Admin"], summary: "View Feed post details", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } }, delete: { tags: ["Admin"], summary: "Delete Feed post", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/admin/stories/{id}": { get: { tags: ["Admin"], summary: "View Feed story details", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } }, delete: { tags: ["Admin"], summary: "Delete Feed story", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/current": { get: { tags: ["Subscriptions"], summary: "Get current vendor subscription", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/plans": { get: { tags: ["Subscriptions"], summary: "List active plans", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/features": { get: { tags: ["Subscriptions"], summary: "Get current plan features", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/checkout": { post: { tags: ["Subscriptions"], summary: "Create a server-priced checkout", security: bearer, requestBody: jsonBody({ type: "object", required: ["planId", "billingCycle"], properties: { planId: { type: "string", format: "uuid" }, billingCycle: { type: "string", enum: ["MONTHLY", "ANNUAL"] } } }), responses: { "200": ok, ...errors, "409": { description: "Active subscription already exists" }, "503": { description: "Payment provider unavailable" } } } },
  "/api/v1/subscriptions/verify-payment": { post: { tags: ["Subscriptions"], summary: "Verify Razorpay payment signature", security: bearer, requestBody: jsonBody({ type: "object", required: ["razorpayOrderId", "razorpayPaymentId", "razorpaySignature"], properties: { razorpayOrderId: { type: "string" }, razorpayPaymentId: { type: "string" }, razorpaySignature: { type: "string" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/cancel": { post: { tags: ["Subscriptions"], summary: "Cancel current subscription", security: bearer, requestBody: jsonBody({ type: "object", properties: { reason: { type: "string" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/payments": { get: { tags: ["Subscriptions"], summary: "List vendor payment history", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/subscriptions/invoices": { get: { tags: ["Subscriptions"], summary: "List vendor invoices", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/dashboard": { get: { tags: ["Subscription Admin"], summary: "Subscription dashboard metrics", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/plans": { get: { tags: ["Subscription Admin"], summary: "List all plans", security: bearer, responses: { "200": ok, ...errors } }, post: { tags: ["Subscription Admin"], summary: "Create plan", security: bearer, requestBody: jsonBody({ "$ref": "#/components/schemas/SubscriptionPlanInput" }), responses: { "201": ok, ...errors, "409": { description: "Duplicate plan slug" } } } },
  "/api/v1/admin/subscriptions/plans/{id}": { get: { tags: ["Subscription Admin"], summary: "Get plan", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } }, put: { tags: ["Subscription Admin"], summary: "Update plan and features", security: bearer, parameters: [idParam], requestBody: jsonBody({ "$ref": "#/components/schemas/SubscriptionPlanInput" }), responses: { "200": ok, ...errors } }, delete: { tags: ["Subscription Admin"], summary: "Delete unused plan", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/plans/{id}/status": { patch: { tags: ["Subscription Admin"], summary: "Activate or deactivate plan", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", required: ["isActive"], properties: { isActive: { type: "boolean" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/features": { get: { tags: ["Subscription Admin"], summary: "List features", security: bearer, responses: { "200": ok, ...errors } }, post: { tags: ["Subscription Admin"], summary: "Create feature", security: bearer, requestBody: jsonBody({ "$ref": "#/components/schemas/SubscriptionFeatureInput" }), responses: { "201": ok, ...errors } } },
  "/api/v1/admin/subscriptions/features/{id}": { put: { tags: ["Subscription Admin"], summary: "Update feature", security: bearer, parameters: [idParam], requestBody: jsonBody({ "$ref": "#/components/schemas/SubscriptionFeatureInput" }), responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/subscribers": { get: { tags: ["Subscription Admin"], summary: "List subscribers with filters and pagination", security: bearer, parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "planId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "status", in: "query", schema: { type: "string" } }, { name: "billingCycle", in: "query", schema: { type: "string", enum: ["MONTHLY", "ANNUAL"] } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/subscribers/{id}": { get: { tags: ["Subscription Admin"], summary: "View subscriber details", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/subscribers/{id}/assign": { post: { tags: ["Subscription Admin"], summary: "Assign a manual plan", security: bearer, parameters: [idParam], requestBody: jsonBody({ "$ref": "#/components/schemas/SubscriptionAssignment" }), responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/subscribers/{id}/cancel": { post: { tags: ["Subscription Admin"], summary: "Cancel subscriber", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", properties: { reason: { type: "string" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/subscribers/{id}/extend": { post: { tags: ["Subscription Admin"], summary: "Extend subscriber expiry", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", required: ["expiresAt"], properties: { expiresAt: { type: "string", format: "date-time" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/payments": { get: { tags: ["Subscription Admin"], summary: "List all subscription payments", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/invoices": { get: { tags: ["Subscription Admin"], summary: "List all subscription invoices", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/admin/subscriptions/audit-logs": { get: { tags: ["Subscription Admin"], summary: "List subscription audit logs", security: bearer, responses: { "200": ok, ...errors } } },
  "/webhooks/razorpay": { post: { tags: ["Subscriptions"], summary: "Process signed Razorpay webhook", parameters: [{ name: "X-Razorpay-Signature", in: "header", required: true, schema: { type: "string" } }, { name: "X-Razorpay-Event-Id", in: "header", required: false, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": ok, "401": { description: "Invalid webhook signature" }, "400": { description: "Invalid webhook payload" } } } },
  "/api/v1/admin/feed/posts/{id}": { get: { tags: ["Admin"], summary: "View any Feed post details", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } }, delete: { tags: ["Admin"], summary: "Soft-delete any Feed post", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/admin/feed/stories/{id}": { get: { tags: ["Admin"], summary: "View any Feed story details", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } }, delete: { tags: ["Admin"], summary: "Soft-delete any Feed story", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/profile": { get: { tags: ["Staff"], summary: "Get logged-in staff profile details", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/dashboard": { get: { tags: ["Staff"], summary: "Get staff dashboard stats and overview", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/appointments": { get: { tags: ["Staff"], summary: "List staff appointments", security: bearer, parameters: [{ name: "status", in: "query", schema: { type: "string" } }, { name: "date", in: "query", schema: { type: "string" } }], responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/earnings": { get: { tags: ["Staff"], summary: "Get staff earnings breakdown", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/commissions": { get: { tags: ["Staff"], summary: "Get staff commission history", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/schedule": { get: { tags: ["Staff"], summary: "Get staff schedule and working hours", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/reviews": { get: { tags: ["Staff"], summary: "Get staff reviews and ratings summary", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/vendor/me/posts": { get: { tags: ["Vendor"], summary: "List logged-in vendor feed posts", description: "Authenticated vendor can list only their own posts. Results are scoped by the authenticated vendor account, not by a client-provided vendorId.", security: bearer, parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "type", in: "query", schema: { type: "string", enum: ["image", "video"] } }], responses: { "200": ok, ...errors } } },
  "/api/v1/vendor/me/stories": { get: { tags: ["Vendor"], summary: "List logged-in vendor stories", description: "Authenticated vendor can list only their own stories. Results are scoped by the authenticated vendor account, not by a client-provided vendorId.", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/posts": { get: { tags: ["Staff"], summary: "List logged-in staff feed posts", description: "Authenticated staff member can list their own posts. Requires RBAC permission `feed.posts.view`.", security: bearer, parameters: [{ name: "page", in: "query", schema: { type: "integer" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "type", in: "query", schema: { type: "string", enum: ["image", "video"] } }], responses: { "200": ok, ...errors } }, post: { tags: ["Staff"], summary: "Create a logged-in staff feed post", description: "Authenticated staff member can create their own post. Requires RBAC permission `feed.posts.create`.", security: bearer, requestBody: jsonBody({ type: "object", required: ["caption", "mediaIds"], properties: { caption: { type: "string" }, visibility: { type: "string", enum: ["PUBLIC", "PRIVATE"] }, status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] }, mediaIds: { type: "array", items: { type: "string", format: "uuid" } }, mediaId: { type: "string", format: "uuid" } } }), responses: { "201": ok, ...errors } } },
  "/api/v1/staff/me/posts/{id}": { put: { tags: ["Staff"], summary: "Update a logged-in staff feed post", description: "Authenticated staff member can update only their own post. Requires RBAC permission `feed.posts.update_own`.", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", properties: { caption: { type: "string" }, visibility: { type: "string", enum: ["PUBLIC", "PRIVATE"] }, status: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED"] }, mediaIds: { type: "array", items: { type: "string", format: "uuid" } }, mediaId: { type: "string", format: "uuid" } } }), responses: { "200": ok, ...errors } }, delete: { tags: ["Staff"], summary: "Delete a logged-in staff feed post", description: "Authenticated staff member can delete only their own post. Requires RBAC permission `feed.posts.delete_own`.", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/posts/{id}/archive": { patch: { tags: ["Staff"], summary: "Archive a logged-in staff feed post", description: "Authenticated staff member can archive only their own post. Owner-only enforcement applies.", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/stories": { get: { tags: ["Staff"], summary: "List logged-in staff stories", description: "Authenticated staff member can list their own stories. Requires RBAC permission `feed.stories.view`.", security: bearer, responses: { "200": ok, ...errors } }, post: { tags: ["Staff"], summary: "Create a logged-in staff story", description: "Authenticated staff member can create their own story. Requires RBAC permission `feed.stories.create`.", security: bearer, requestBody: jsonBody({ type: "object", required: ["mediaIds"], properties: { caption: { type: "string" }, mediaIds: { type: "array", items: { type: "string", format: "uuid" } }, mediaId: { type: "string", format: "uuid" } } }), responses: { "201": ok, ...errors } } },
  "/api/v1/staff/me/stories/{id}": { put: { tags: ["Staff"], summary: "Update a logged-in staff story", description: "Authenticated staff member can update only their own story. Requires RBAC permission `feed.stories.update_own`.", security: bearer, parameters: [idParam], requestBody: jsonBody({ type: "object", properties: { caption: { type: "string" }, mediaIds: { type: "array", items: { type: "string", format: "uuid" } }, mediaId: { type: "string", format: "uuid" } } }), responses: { "200": ok, ...errors } }, delete: { tags: ["Staff"], summary: "Delete a logged-in staff story", description: "Authenticated staff member can delete only their own story. Requires RBAC permission `feed.stories.delete_own`.", security: bearer, parameters: [idParam], responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/notifications": { get: { tags: ["Staff"], summary: "Get staff notifications", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/bank-details": { get: { tags: ["Staff"], summary: "Get own staff bank details", description: "Returns only the authenticated staff member's bank details. Account number is masked and secrets are never returned.", security: bearer, responses: { "200": ok, ...errors } }, put: { tags: ["Staff"], summary: "Create or update own staff bank details", description: "Creates or updates the authenticated staff member's bank details. IFSC is normalized to uppercase and bankCode is derived from its first four characters. A masked account number preserves the stored account number.", security: bearer, requestBody: jsonBody({ type: "object", properties: { accountHolderName: { type: "string", example: "John Doe" }, bankName: { type: "string", example: "HDFC Bank" }, accountNumber: { type: "string", example: "123456789012" }, ifscCode: { type: "string", example: "HDFC0001234" }, accountType: { type: "string", enum: ["SAVINGS", "CURRENT", "SALARY", "OTHER"] }, branchName: { type: "string" }, upiId: { type: "string", example: "john@upi" }, upiName: { type: "string" } } }), responses: { "200": ok, "400": { description: "Invalid account, IFSC, or UPI data" }, "401": { description: "Unauthorized" }, "403": { description: "Bank details permission denied" } } }, delete: { tags: ["Staff"], summary: "Delete own staff bank details", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/bank-details/qr": { post: { tags: ["Staff"], summary: "Generate own UPI QR code", description: "Generates a QR data URL containing only the staff member's UPI payment URI.", security: bearer, responses: { "200": ok, "400": { description: "UPI ID is required" }, "401": { description: "Unauthorized" }, "403": { description: "QR permission denied" } } } },
  "/api/v1/staff/me/support/faqs": { get: { tags: ["Staff"], summary: "Get help and support FAQs", security: bearer, responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/support/tickets": { get: { tags: ["Staff"], summary: "List logged-in staff support tickets", security: bearer, responses: { "200": ok, ...errors } }, post: { tags: ["Staff"], summary: "Create a support ticket for the logged-in staff", security: bearer, requestBody: jsonBody({ type: "object", required: ["subject", "message"], properties: { subject: { type: "string" }, category: { type: "string" }, priority: { type: "string" }, message: { type: "string" } } }), responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/notifications/{id}/read": { patch: { tags: ["Staff"], summary: "Mark a staff notification as read", security: bearer, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": ok, ...errors } } },
  "/api/v1/staff/me/notifications/read-all": { patch: { tags: ["Staff"], summary: "Mark all staff notifications as read", security: bearer, responses: { "200": ok, ...errors } } },
});

Object.assign(openapiPaths, {
  "/api/v1/admin/feed/filters": {
    get: {
      tags: ["Admin"],
      summary: "Get paginated Feed filter metadata",
      description: "Returns first-page country, city, vendor, salon, branch, and staff options. Use the typed filter endpoint to search or paginate larger collections.",
      security: bearer,
      parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "countryId", in: "query", schema: { type: "string" } }, { name: "cityId", in: "query", schema: { type: "string" } }, { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "branchId", in: "query", schema: { type: "string", format: "uuid" } }],
      responses: { "200": ok, ...errors },
    },
  },
  "/api/v1/admin/feed/filters/{type}": {
    get: {
      tags: ["Admin"],
      summary: "Search or paginate Feed filter options",
      description: "Supported types are countries, cities, vendors, salons, branches, and staff. Dependent options are restricted to the selected parent locations.",
      security: bearer,
      parameters: [{ name: "type", in: "path", required: true, schema: { type: "string", enum: ["countries", "cities", "vendors", "salons", "branches", "staff"] } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "countryId", in: "query", schema: { type: "string" } }, { name: "cityId", in: "query", schema: { type: "string" } }, { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "branchId", in: "query", schema: { type: "string", format: "uuid" } }],
      responses: { "200": ok, ...errors },
    },
  },
  "/api/v1/admin/feed/posts": {
    get: { tags: ["Admin"], summary: "List filtered Feed posts", security: bearer, parameters: adminFeedListParameters, responses: { "200": ok, ...errors } },
  },
  "/api/v1/admin/feed/stories": {
    get: { tags: ["Admin"], summary: "List filtered Feed stories", security: bearer, parameters: adminFeedListParameters, responses: { "200": ok, ...errors } },
  },
  "/api/v1/staff/me/stories": {
    get: { tags: ["Staff"], summary: "List logged-in staff stories", description: "Returns only stories owned by the authenticated staff member. Requires `feed.stories.view`.", security: bearer, parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } }], responses: { "200": ok, "401": { description: "Missing or invalid bearer token" }, "403": { description: "Staff story view permission denied" } } },
    post: { tags: ["Staff"], summary: "Create a staff story", description: "Accepts either multipart/form-data with one `media` file or the existing JSON `mediaId`/`mediaIds` reference flow. Direct uploads are stored under the story media location. Ownership is resolved from the bearer token.", security: bearer, requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { caption: { type: "string" }, media: { type: "string", format: "binary" } }, required: ["media"] } }, "application/json": { schema: { type: "object", properties: { caption: { type: "string" }, mediaId: { type: "string", format: "uuid" }, mediaIds: { type: "array", items: { type: "string", format: "uuid" } } } } } } }, responses: { "201": ok, "400": { description: "Invalid story media or media reference" }, "401": { description: "Missing or invalid bearer token" }, "403": { description: "Staff story creation permission denied" }, "413": { description: "Story media exceeds the allowed size" } } },
  },
  "/api/v1/staff/me/stories/{id}": {
    put: { tags: ["Staff"], summary: "Update a staff story", description: "Updates only a story owned by the authenticated staff member. A replacement `media` file may be sent as multipart/form-data.", security: bearer, parameters: [idParam], requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", properties: { caption: { type: "string" }, status: { type: "string" }, media: { type: "string", format: "binary" } } } }, "application/json": { schema: { type: "object", properties: { caption: { type: "string" }, status: { type: "string" }, mediaId: { type: "string", format: "uuid" }, mediaIds: { type: "array", items: { type: "string", format: "uuid" } } } } } } }, responses: { "200": ok, "400": { description: "Invalid story media or media reference" }, "401": { description: "Missing or invalid bearer token" }, "403": { description: "Story does not belong to the authenticated staff member" } } },
    delete: { tags: ["Staff"], summary: "Delete a staff story", description: "Soft-deletes only a story owned by the authenticated staff member.", security: bearer, parameters: [idParam], responses: { "200": ok, "401": { description: "Missing or invalid bearer token" }, "403": { description: "Story does not belong to the authenticated staff member" } } },
  },
});

openapiPaths["/api/v1/staff/attendance"].get.parameters = [
  { name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "branchId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "staffId", in: "query", schema: { type: "string", format: "uuid" } },
  { name: "status", in: "query", schema: { type: "string", enum: ["PRESENT", "HALF_DAY", "ABSENT"] } },
  { name: "search", in: "query", schema: { type: "string" } },
  { name: "date", in: "query", schema: { type: "string", format: "date" } },
  { name: "month", in: "query", schema: { type: "string", pattern: "^\\d{4}-(0[1-9]|1[0-2])$" } },
  { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
  { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
];
openapiPaths["/api/v1/salons"].get = {
  tags: ["Salons"],
  summary: "Search permitted salons",
  security: bearer,
  parameters: [{ name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } }],
  responses: { "200": ok, ...errors },
};
Object.assign(openapiPaths, {
  "/api/v1/vendors": {
    get: { tags: ["Vendor"], summary: "Search permitted vendors", security: bearer, parameters: [{ name: "search", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }], responses: { "200": ok, ...errors } },
  },
  "/api/v1/branches": {
    get: { tags: ["Salons"], summary: "Search branches by salon or vendor", security: bearer, parameters: [{ name: "vendorId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "salonId", in: "query", schema: { type: "string", format: "uuid" } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }], responses: { "200": ok, ...errors } },
  },
});

Object.assign(openapiSchemas, {
  SubscriptionFeatureInput: { type: "object", required: ["key", "displayName"], properties: { key: { type: "string", example: "advanced_reports" }, displayName: { type: "string" }, description: { type: "string" }, featureText: { type: "string" }, sortOrder: { type: "integer" }, isActive: { type: "boolean" } } },
  SubscriptionPlanInput: { type: "object", required: ["name", "slug"], properties: { name: { type: "string" }, slug: { type: "string" }, monthlyPrice: { type: "integer", minimum: 0 }, annualPrice: { type: "integer", minimum: 0 }, currency: { type: "string", example: "INR" }, monthlyEnabled: { type: "boolean" }, annualEnabled: { type: "boolean" }, maxBranches: { type: "integer", nullable: true }, maxStaff: { type: "integer", nullable: true }, maxCustomers: { type: "integer", nullable: true }, maxBookingsPerMonth: { type: "integer", nullable: true }, features: { type: "array", items: { type: "object" } } } },
  SubscriptionAssignment: { type: "object", required: ["planId", "billingCycle"], properties: { planId: { type: "string", format: "uuid" }, billingCycle: { type: "string", enum: ["MONTHLY", "ANNUAL"] }, amount: { type: "integer", minimum: 0 }, startsAt: { type: "string", format: "date-time" }, expiresAt: { type: "string", format: "date-time", nullable: true }, notes: { type: "string" } } },
});

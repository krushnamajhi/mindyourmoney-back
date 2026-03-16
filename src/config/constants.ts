
export const Errors = {
    NotFound: {
        StatusCode: 404,
        StatusMessage: "Not Found"
    },
    InternalServerError: {
        StatusCode: 500,
        StatusMessage: "Internal Server Error"
    },
    BadRequest: {
        StatusCode: 400,
        StatusMessage: "Bad Request"
    },
    ZodError: {
        StatusCode: 422,
        StatusMessage: "Validation Error"
    },
    APIError: {
        StatusCode: 211,
        StatusMessage: "API Error"
    },
    ValidationError: {
        StatusCode: 423,
        StatusMessage: "Validation Error"
    }
}

export const Filter_ALL = 'ALL'
export const Filter_NONE = 'NONE'
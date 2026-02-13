import { describe, expect, it, vi } from 'vitest';
import { AppError, errorHandler } from './errorHandler';

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockReq = {} as any;
const mockNext = vi.fn();

describe('AppError', () => {
  it('creates error with status code and message', () => {
    const err = new AppError(404, 'Not found', 'NOT_FOUND');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('AppError');
  });

  it('extends Error', () => {
    const err = new AppError(500, 'oops');
    expect(err).toBeInstanceOf(Error);
  });
});

describe('errorHandler', () => {
  it('handles AppError with correct status and body', () => {
    const res = mockRes();
    const err = new AppError(400, 'Bad request', 'BAD_REQUEST');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Bad request',
        code: 'BAD_REQUEST',
      },
    });
  });

  it('handles unknown errors as 500', () => {
    const res = mockRes();
    const err = new Error('unexpected');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  });

  it('handles AppError without code', () => {
    const res = mockRes();
    const err = new AppError(422, 'Validation failed');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: 'Validation failed',
        code: undefined,
      },
    });
  });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sum_1 = require("./sum");
describe('sum', () => {
    it('adds two numbers', () => {
        expect((0, sum_1.sum)(1, 2)).toBe(3);
    });
});

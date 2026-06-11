const { storeFormat, computePivotLevels } = require('../../pivot_engine');

describe('Pivot Engine', () => {
    describe('storeFormat', () => {
        it('should format numbers to 4 decimal places', () => {
            expect(storeFormat(12.345678)).toBe(12.3457);
            expect(storeFormat(12.3)).toBe(12.3);
            expect(storeFormat(12)).toBe(12);
        });

        it('should handle NaN gracefully', () => {
            expect(storeFormat(NaN)).toBeNull();
        });
    });

    describe('computePivotLevels', () => {
        it('should calculate classic pivot levels correctly', () => {
            const high = 150;
            const low = 140;
            const close = 145;
            
            const levels = computePivotLevels(high, low, close);
            
            // Expected P = (150 + 140 + 145) / 3 = 145
            expect(levels.pivot).toBe(145);
            
            // Expected R1 = (145 * 2) - 140 = 150
            expect(levels.r1).toBe(150);
            
            // Expected S1 = (145 * 2) - 150 = 140
            expect(levels.s1).toBe(140);
            
            // Expected R2 = 145 + (150 - 140) = 155
            expect(levels.r2).toBe(155);
            
            // Expected S2 = 145 - (150 - 140) = 135
            expect(levels.s2).toBe(135);
            
            // Expected R3 = 150 + 2 * (145 - 140) = 160
            expect(levels.r3).toBe(160);
            
            // Expected S3 = 140 - 2 * (150 - 145) = 130
            expect(levels.s3).toBe(130);
        });
    });
});

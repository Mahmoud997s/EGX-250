const { clamp, getMarketBias, getZone, getSignals, getStrengthScore } = require('../../intelligence_engine');

describe('Intelligence Engine', () => {
    describe('clamp', () => {
        it('should clamp values correctly', () => {
            expect(clamp(150, 0, 100)).toBe(100);
            expect(clamp(-50, 0, 100)).toBe(0);
            expect(clamp(50, 0, 100)).toBe(50);
        });
    });

    describe('getMarketBias', () => {
        it('should detect STRONG_BULL', () => {
            expect(getMarketBias(110, 100)).toBe('STRONG_BULL'); // 10% diff
        });
        it('should detect WEAK_BULL', () => {
            expect(getMarketBias(101, 100)).toBe('WEAK_BULL'); // 1% diff
        });
        it('should detect NEUTRAL', () => {
            expect(getMarketBias(100.4, 100)).toBe('NEUTRAL'); // 0.4% diff
        });
        it('should detect WEAK_BEAR', () => {
            expect(getMarketBias(99, 100)).toBe('WEAK_BEAR'); // 1% diff
        });
        it('should detect STRONG_BEAR', () => {
            expect(getMarketBias(90, 100)).toBe('STRONG_BEAR'); // 10% diff
        });
    });

    describe('getZone', () => {
        it('should detect PIVOT_ZONE', () => {
            const levels = { pivot: 100, r1: 110, s1: 90 };
            expect(getZone(100.2, levels)).toBe('PIVOT_ZONE');
        });
        it('should detect RESISTANCE_ZONE', () => {
            const levels = { pivot: 100, r1: 110, s1: 90 };
            expect(getZone(110, levels)).toBe('RESISTANCE_ZONE');
        });
        it('should detect SUPPORT_ZONE', () => {
            const levels = { pivot: 100, r1: 110, s1: 90 };
            expect(getZone(90, levels)).toBe('SUPPORT_ZONE');
        });
    });

    describe('getSignals', () => {
        it('should extract breakout signals', () => {
            const levels = { r1: 110 };
            const signals = getSignals(112, 112, 110, levels);
            expect(signals).toContain('BREAKOUT_R1');
        });
    });

    describe('getStrengthScore', () => {
        it('should output a valid score', () => {
            const levels = { pivot: 100, r1: 110, r2: 120, s1: 90, s2: 80 };
            // Bullish: > pivot (+20), > r1 (+10) -> 50 + 30 = 80
            expect(getStrengthScore(115, 115, 110, 100, levels)).toBe(80);
            
            // Bearish: < pivot (-20), < s1 (-10) -> 50 - 30 = 20
            expect(getStrengthScore(85, 90, 85, 100, levels)).toBe(20);
        });
    });
});

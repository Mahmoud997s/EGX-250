const { isBull, isBear, processTimeIntelligence } = require('../../time_intelligence_engine');

describe('Time Intelligence Engine', () => {
    describe('isBull', () => {
        it('should correctly identify bullish biases', () => {
            expect(isBull('STRONG_BULL')).toBe(true);
            expect(isBull('WEAK_BULL')).toBe(true);
            expect(isBull('NEUTRAL')).toBe(false);
            expect(isBull('STRONG_BEAR')).toBe(false);
        });
    });

    describe('isBear', () => {
        it('should correctly identify bearish biases', () => {
            expect(isBear('STRONG_BEAR')).toBe(true);
            expect(isBear('WEAK_BEAR')).toBe(true);
            expect(isBear('NEUTRAL')).toBe(false);
            expect(isBear('STRONG_BULL')).toBe(false);
        });
    });

    describe('processTimeIntelligence', () => {
        it('should return default values when history is empty', () => {
            const current = { intelligence: { bias: 'STRONG_BULL', strengthScore: 80, signals: [] } };
            const history = [];
            
            const result = processTimeIntelligence(current, history);
            expect(result.trend).toBe('STABLE');
            expect(result.biasStability).toBe('UNCONFIRMED_BIAS');
            expect(result.signalBehavior).toBe('NONE');
            expect(result.timeStrengthScore).toBe(80);
            expect(result.marketRegime).toBe('SIDEWAYS_RANGE');
        });

        it('should identify TRENDING_UP correctly with improving scores', () => {
            const history = [
                { bias: 'WEAK_BULL', score: 60 },
                { bias: 'WEAK_BULL', score: 70 }
            ];
            const current = { intelligence: { bias: 'STRONG_BULL', strengthScore: 85, signals: [] } };
            
            const result = processTimeIntelligence(current, history);
            expect(result.trend).toBe('IMPROVING');
            expect(result.biasStability).toBe('CONFIRMED_BULL');
            expect(result.marketRegime).toBe('TRENDING_UP');
            // Base 85 + (2 history * 5) = 95
            expect(result.timeStrengthScore).toBe(95);
        });

        it('should identify DISTRIBUTION correctly with declining scores', () => {
            const history = [
                { bias: 'STRONG_BULL', score: 90 },
                { bias: 'WEAK_BULL', score: 70 }
            ];
            const current = { intelligence: { bias: 'NEUTRAL', strengthScore: 50, signals: [] } };
            
            const result = processTimeIntelligence(current, history);
            expect(result.trend).toBe('DECLINING');
            expect(result.marketRegime).toBe('DISTRIBUTION');
            expect(result.timeStrengthScore).toBe(50);
        });
    });
});

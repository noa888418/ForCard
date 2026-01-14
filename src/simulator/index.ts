/**
 * シミュレーター実行エントリーポイント
 */

import { SimulatorRunner } from './SimulatorRunner.js';

// ブラウザ環境とNode.js環境の両方に対応
if (typeof window !== 'undefined') {
  // ブラウザ環境
  (window as any).runSimulator = async () => {
    const runner = new SimulatorRunner();
    await runner.runAll();
  };

  (window as any).testCard = async (cardId: string) => {
    const runner = new SimulatorRunner();
    await runner.testSpecificCard(cardId);
  };
} else {
  // Node.js環境
  const runner = new SimulatorRunner();
  runner.runAll().catch(console.error);
}

export { SimulatorRunner };
export { CardEffectSimulator } from './CardEffectSimulator.js';
export { GameFlowSimulator } from './GameFlowSimulator.js';



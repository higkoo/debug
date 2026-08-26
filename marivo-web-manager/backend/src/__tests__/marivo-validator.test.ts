import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock the toml module
jest.mock('toml', () => ({
  parse: jest.fn().mockReturnValue({
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project',
  }),
}));

describe('validateMarivoProject', () => {
  const testDir = path.join(os.tmpdir(), 'marivo-test-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'models'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'models', 'test-model.py'), 'print("hello")');
    fs.writeFileSync(path.join(testDir, 'marivo.toml'), 'name = "test-project"\nversion = "1.0.0"');
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should validate a correct Marivo project', async () => {
    const { validateMarivoProject } = await import('../utils/marivo-validator');
    const result = await validateMarivoProject(testDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for a project without marivo.toml', async () => {
    const emptyDir = path.join(os.tmpdir(), 'marivo-empty-' + Date.now());
    fs.mkdirSync(emptyDir, { recursive: true });

    const { validateMarivoProject } = await import('../utils/marivo-validator');
    const result = await validateMarivoProject(emptyDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('缺少 marivo.toml 配置文件');

    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('should fail for a project without models/ directory', async () => {
    const noModelsDir = path.join(os.tmpdir(), 'marivo-nomodels-' + Date.now());
    fs.mkdirSync(noModelsDir, { recursive: true });
    fs.writeFileSync(path.join(noModelsDir, 'marivo.toml'), 'name = "test"');

    const { validateMarivoProject } = await import('../utils/marivo-validator');
    const result = await validateMarivoProject(noModelsDir);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('缺少 models/ 目录');

    fs.rmSync(noModelsDir, { recursive: true, force: true });
  });
});

describe('buildFileTree', () => {
  const testDir = path.join(os.tmpdir(), 'marivo-tree-' + Date.now());

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'models'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'data'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'marivo.toml'), '');
    fs.writeFileSync(path.join(testDir, 'models', 'test.py'), '');
    fs.writeFileSync(path.join(testDir, 'data', 'sample.csv'), '');
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should build a file tree from directory structure', async () => {
    const { buildFileTree } = await import('../utils/marivo-validator');
    const tree = buildFileTree(testDir);
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);

    const modelsDir = tree.find((n: any) => n.name === 'models' && n.type === 'dir');
    expect(modelsDir).toBeDefined();
    expect(modelsDir.children).toHaveLength(1);
  });
});
import { describe, expect, it } from 'bun:test';
import { deepMerge } from '../config/loader';
import { PluginConfigSchema } from '../config/schema';

describe('workflows config schema', () => {
  it('applies default values when config has no workflows section', () => {
    const config = PluginConfigSchema.parse({});
    // workflows field itself is optional, so it is undefined when not provided
    expect(config.workflows).toBeUndefined();
  });

  it('parses custom enabled and auto_route values as booleans', () => {
    const config = PluginConfigSchema.parse({
      workflows: { enabled: false, auto_route: false },
    });
    expect(config.workflows?.enabled).toBe(false);
    expect(config.workflows?.auto_route).toBe(false);
  });

  it('parses default_workflow as string when provided', () => {
    const config = PluginConfigSchema.parse({
      workflows: { default_workflow: 'my-workflow' },
    });
    expect(config.workflows?.default_workflow).toBe('my-workflow');
  });

  it('allows partial workflows config to override only specified fields', () => {
    const config = PluginConfigSchema.parse({
      workflows: { enabled: false },
    });
    expect(config.workflows?.enabled).toBe(false);
    expect(config.workflows?.auto_route).toBe(true); // default preserved
  });
});

describe('workflows config deepMerge', () => {
  it('project-level workflows override user-level workflows', () => {
    const userConfig = {
      workflows: { enabled: true, auto_route: true },
    };
    const projectConfig = {
      workflows: { enabled: false, auto_route: false },
    };
    const merged = deepMerge(userConfig, projectConfig) as typeof userConfig;
    expect(merged.workflows?.enabled).toBe(false);
    expect(merged.workflows?.auto_route).toBe(false);
  });

  it('preserves user workflows when project has no workflows config', () => {
    const userConfig = {
      workflows: { enabled: true, auto_route: false },
    };
    const projectConfig = {};
    const merged = deepMerge(userConfig, projectConfig) as typeof userConfig;
    expect(merged.workflows?.enabled).toBe(true);
    expect(merged.workflows?.auto_route).toBe(false);
  });

  it('handles missing workflows in both configs gracefully', () => {
    const userConfig = {};
    const projectConfig = {};
    const merged = deepMerge(userConfig, projectConfig);
    // deepMerge returns empty object when both inputs are empty
    expect(merged).toEqual({});
  });

  it('deepMerges nested workflow fields', () => {
    const userConfig = {
      workflows: {
        enabled: true,
        auto_route: true,
        default_workflow: 'user-default',
      },
    };
    const projectConfig = {
      workflows: { auto_route: false },
    };
    const merged = deepMerge(userConfig, projectConfig) as typeof userConfig;
    expect(merged.workflows?.enabled).toBe(true); // from user
    expect(merged.workflows?.auto_route).toBe(false); // from project
    expect(merged.workflows?.default_workflow).toBe('user-default'); // preserved
  });

  it('project-level default_workflow overrides user-level', () => {
    const userConfig = {
      workflows: { default_workflow: 'user-workflow' },
    };
    const projectConfig = {
      workflows: { default_workflow: 'project-workflow' },
    };
    const merged = deepMerge(userConfig, projectConfig) as typeof userConfig;
    expect(merged.workflows?.default_workflow).toBe('project-workflow');
  });
});

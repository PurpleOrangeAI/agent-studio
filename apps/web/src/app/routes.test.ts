import { describe, expect, it } from 'vitest';

import { buildAppRoute, parseAppRoute } from './routes';

describe('app routes', () => {
  it('parses the system overview route', () => {
    expect(parseAppRoute('/systems/system_alpha')).toEqual({
      view: 'overview',
      systemId: 'system_alpha',
    });
  });

  it('parses room routes for a system', () => {
    expect(parseAppRoute('/systems/system_alpha/replay')).toEqual({
      view: 'replay',
      systemId: 'system_alpha',
    });
  });

  it('parses the connect route', () => {
    expect(parseAppRoute('/connect')).toEqual({
      view: 'connect',
      systemId: null,
    });
  });

  it('builds stable deep-link routes', () => {
    expect(
      buildAppRoute({
        view: 'optimize',
        systemId: 'system alpha',
      }),
    ).toBe('/systems/system%20alpha/optimize');
  });
});

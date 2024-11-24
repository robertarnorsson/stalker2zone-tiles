import { Hono } from 'hono'

export type Env = {
  BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => {
  return c.text('Tile server for stalker2.zone')
})

app.get(':v/:z/:x/:y', async (c) => {
  const { BUCKET } = c.env;
  const { v, z, x, y } = c.req.param();

  if (!/^v([1-9]|[1-9][0-9])$/.test(v)) {
    return c.text('Invalid version format. Must be v1-v99.', 400);
  }

  if (isNaN(Number(z)) || isNaN(Number(x)) || isNaN(Number(y))) {
    return c.text('Invalid tile coordinates', 400);
  }

  try {
    const tilePath = `${v}/${z}/${x}/${y}.jpg`;

    const tile = await BUCKET.get(tilePath);

    if (!tile) {
      return c.text('Tile not found', 404);
    }

    if (!tile.body) {
      return c.text('Tile content is empty', 500);
    }

    return c.body(tile.body, 200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000'
    });
  } catch (error) {
    console.error('Error fetching tile.');

    if (error instanceof TypeError) {
      return c.text('Invalid tile format or bucket configuration', 500);
    } else if (error instanceof RangeError) {
      return c.text('Tile coordinates are out of range', 400);
    }

    return c.text('Internal Server Error', 500);
  }
});

export default app;

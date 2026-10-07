import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createClient, type User } from '@supabase/supabase-js';
import { createPetManagementRouter } from '../src/modules/pets/pet.management.js';

// Use local-only values for the auth module; all database requests below are mocked.
process.env.SUPABASE_DB_URL = 'postgresql://localhost/test';
process.env.SUPABASE_URL = 'https://example.test';
process.env.SUPABASE_SECRET_KEY = 'test-key';
process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key';
const { createPetRouter } = await import('../src/modules/pets/pet.routes.js');
import { validImage, validPhotoPath } from '../src/modules/pets/pet.validation.js';

const staff = '11111111-1111-4111-8111-111111111111';

// Fake Supabase HTTP responses let us exercise Express without touching a real project.
async function fixture() {
    const pets: any[] = [
        { id: 1, pet_name: 'Rex', shelter_id: 1, species: 'Dog', breed: '', age: '2 years', description: '', health_info: '', allergies: '', photo_paths: [], available: true, shelter: { shelter_name: 'Shelter One' } },
        { id: 2, pet_name: 'Pancake', shelter_id: 2, species: 'Cat', photo_paths: [], available: true, shelter: { shelter_name: 'Shelter Two' } },
        { id: 3, pet_name: 'Old listing', shelter_id: 1, species: 'Dog', photo_paths: [], available: false, shelter: { shelter_name: 'Shelter One' } },
    ];
    const writes: string[] = [];
    const photos = new Set<string>();
    const db = createClient('https://example.test', 'test-key', {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: async (input, options) => {
            const url = new URL(String(input));
            const method = options?.method || 'GET';
            const body = typeof options?.body === 'string' ? JSON.parse(options.body) : null;
            const headers = new Headers(options?.headers);
            let data: any = [];
            if (url.pathname.endsWith('/ShelterStaff')) {
                data = url.searchParams.get('auth_user_id') === `eq.${staff}`
                    ? [{ shelter_id: 1, shelter: { shelter_name: 'Shelter One' } }] : [];
            } else if (url.pathname.endsWith('/Listings')) {
                data = pets.filter(pet => ['id', 'shelter_id', 'available'].every(key => {
                    const filter = url.searchParams.get(key);
                    if (!filter) return true;
                    if (filter.startsWith('in.')) return filter.slice(4, -1).split(',').includes(String(pet[key]));
                    return filter === `eq.${pet[key]}`;
                }));
                if (method === 'POST') {
                    writes.push('insert');
                    const created = { ...body, id: 4, shelter: { shelter_name: 'Shelter One' } };
                    pets.push(created); data = [created];
                }
                if (method === 'PATCH') { writes.push('update'); data.forEach((pet: any) => Object.assign(pet, body)); }
                if (method === 'GET' && url.searchParams.has('limit')) data = data.slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + Number(url.searchParams.get('limit')));
                if (headers.get('Accept')?.includes('vnd.pgrst.object')) data = data[0];
            } else if (url.pathname.endsWith('/Shelters')) {
                data = [{ shelter_name: 'Shelter One' }];
            } else if (url.pathname.startsWith('/storage/v1/object/sign/pet-photos')) {
                data = body.paths.map((path: string) => photos.has(path)
                    ? { path, signedURL: `/object/sign/pet-photos/${path}?token=test` }
                    : { path, error: 'Not found' });
            } else if (url.pathname.startsWith('/storage/v1/object/pet-photos/')) {
                const path = url.pathname.split('/pet-photos/')[1];
                photos.add(path);
                writes.push('upload');
                data = { Key: `pet-photos/${path}`, Id: 'test-object' };
            } else throw new Error(`Unexpected request: ${url.pathname}`);
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } },
    });
    const app = express();
    app.use(express.json({ limit: '8mb' }));
    app.use('/api/pets', createPetManagementRouter(db, (req, res, next) => {
        const userId = req.headers.authorization?.replace('Bearer ', '');
        if (!userId) { res.status(401).json({ message: 'Authentication required' }); return; }
        req.user = { id: userId } as User;
        next();
    }));
    app.use('/api/pets', createPetRouter(db));
    app.use((err: any, _req: any, res: any, _next: any) => { res.status(500).json({ message: err.message }); });
    const server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const address = server.address() as { port: number };
    return {
        pets, writes,
        request: (path: string, method = 'GET', body?: unknown, user = staff) => fetch(`http://127.0.0.1:${address.port}/api/pets${path}`, {
            method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${user}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        }),
        close: () => new Promise<void>(resolve => server.close(() => resolve())),
    };
}

test('creation validates required fields and the new listing can be viewed', async () => {
    const f = await fixture();
    try {
        assert.equal((await f.request('/', 'POST', { pet_name: ' ', species: 'Dog', shelter_id: '1' })).status, 400);
        const response = await f.request('/', 'POST', { pet_name: 'Buddy', species: 'Dog', shelter_id: '1' });
        assert.equal(response.status, 201);
        assert.equal((await response.json()).pet.id, '4');
        const { pet } = await (await f.request('/4')).json();
        assert.equal(pet.pet_name, 'Buddy');
        assert.equal(pet.available, true);
        assert.equal(pet.photo_paths, undefined);
    } finally { await f.close(); }
});

test('creation and photo upload require login and assigned shelter membership', async () => {
    const f = await fixture();
    try {
        for (const [path, method] of [['/shelters', 'GET'], ['/manage', 'GET'], ['/', 'POST'], ['/photos', 'POST']]) {
            assert.equal((await f.request(path, method, undefined, '')).status, 401);
        }
        assert.equal((await f.request('/manage', 'GET', undefined, 'ordinary-user')).status, 403);
        assert.equal((await f.request('/', 'POST', { pet_name: 'Buddy', species: 'Dog', shelter_id: '2' })).status, 403);
        assert.equal((await f.request('/photos', 'POST', { shelter_id: '2', content_type: 'image/png', data: 'AAAA' })).status, 403);
        assert.deepEqual(f.writes, []);
        assert.deepEqual((await (await f.request('/manage')).json()).pets.map((pet: any) => pet.id), ['1', '3']);
    } finally { await f.close(); }
});

test('invalid photos and foreign paths cannot be attached to a listing', async () => {
    const f = await fixture();
    try {
        for (const path of ['https://example.com/photo.png', `2/${staff}/${staff}.png`, `1/${staff}/${staff}.png`]) {
            assert.equal((await f.request('/', 'POST', { pet_name: 'Buddy', species: 'Dog', shelter_id: '1', photo_paths: [path] })).status, 400);
        }
        assert.equal((await f.request('/photos', 'POST', { shelter_id: '1', content_type: 'image/png', data: Buffer.from('not an image').toString('base64') })).status, 400);
        assert.deepEqual(f.writes, []);
        assert.equal(validImage(Buffer.alloc(6 * 1024 * 1024), 'image/png'), false);
        assert.equal(validPhotoPath(`2/${staff}/${staff}.png`, '1'), false);
    } finally { await f.close(); }
});

test('a photo can be uploaded, attached to a new pet and shown with a signed URL', async () => {
    const f = await fixture();
    try {
        const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
        const uploaded = await f.request('/photos', 'POST', { shelter_id: '1', content_type: 'image/png', data: png });
        assert.equal(uploaded.status, 201);
        const { path } = await uploaded.json();
        assert.equal((await f.request('/', 'POST', { pet_name: 'Buddy', species: 'Dog', shelter_id: '1', photo_paths: [path] })).status, 201);
        const { pet } = await (await f.request('/4')).json();
        assert.equal(pet.photos.length, 1);
        assert.ok(pet.photos[0].includes(path));
        assert.deepEqual(f.pets.find(pet => pet.id === 4).photo_paths, [path]);
    } finally { await f.close(); }
});


test('editing loads existing fields and saves changes without creating another listing', async () => {
    const f = await fixture();
    try {
        const before = (await (await f.request('/1/edit')).json()).pet;
        assert.equal(before.pet_name, 'Rex');
        assert.equal(before.age, '2 years');
        assert.deepEqual(before.photo_paths, []);
        const response = await f.request('/1', 'PUT', {
            pet_name: 'Rex updated', species: 'Dog', shelter_id: '1', age: '3 years', health_info: 'Vaccinated',
        });
        assert.equal(response.status, 200);
        const after = (await (await f.request('/1')).json()).pet;
        assert.equal(after.pet_name, 'Rex updated');
        assert.equal(after.health_info, 'Vaccinated');
        assert.equal(after.age, '3 years');
        assert.equal(after.available, true);
        assert.equal(f.pets.length, 3);
        assert.deepEqual(f.writes, ['update']);
    } finally { await f.close(); }
});

test('editing rejects missing access, invalid fields and attempts to change shelter', async () => {
    const f = await fixture();
    try {
        const input = { pet_name: 'Rex', species: 'Dog', shelter_id: '1' };
        assert.equal((await f.request('/1/edit', 'GET', undefined, '')).status, 401);
        assert.equal((await f.request('/1', 'PUT', input, '')).status, 401);
        assert.equal((await f.request('/1', 'PUT', input, 'ordinary-user')).status, 403);
        assert.equal((await f.request('/2/edit')).status, 403);
        assert.equal((await f.request('/2', 'PUT', input)).status, 403);
        assert.equal((await f.request('/1', 'PUT', { ...input, shelter_id: '2' })).status, 403);
        assert.equal((await f.request('/1', 'PUT', { ...input, pet_name: ' ' })).status, 400);
        assert.equal((await f.request('/999/edit')).status, 404);
        assert.equal((await f.request('/999', 'PUT', input)).status, 404);
        assert.equal((await f.request('/9223372036854775808/edit')).status, 400);
        assert.equal((await f.request('/invalid', 'PUT', input)).status, 400);
        assert.deepEqual(f.writes, []);
    } finally { await f.close(); }
});

test('editing can replace photos but cannot attach foreign or missing files', async () => {
    const f = await fixture();
    try {
        const input = { pet_name: 'Rex', species: 'Dog', shelter_id: '1' };
        const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
        const uploaded = await f.request('/photos', 'POST', { shelter_id: '1', content_type: 'image/png', data: png });
        const { path } = await uploaded.json();
        assert.equal((await f.request('/1', 'PUT', { ...input, photo_paths: [path] })).status, 200);
        const saved = (await (await f.request('/1/edit')).json()).pet;
        assert.deepEqual(saved.photo_paths, [path]);
        assert.ok(saved.photos[0].includes(path));
        for (const invalid of [`2/${staff}/${staff}.png`, `1/${staff}/${staff}.png`]) {
            assert.equal((await f.request('/1', 'PUT', { ...input, photo_paths: [invalid] })).status, 400);
        }
        assert.deepEqual((await (await f.request('/1/edit')).json()).pet.photo_paths, [path]);
        assert.equal((await f.request('/1', 'PUT', { ...input, photo_paths: [] })).status, 200);
        assert.deepEqual((await (await f.request('/1')).json()).pet.photos, []);
    } finally { await f.close(); }
});


test('removal marks the listing unavailable and keeps its details', async () => {
    const f = await fixture();
    try {
        const before = { ...f.pets[0] };
        assert.equal((await f.request('/1', 'DELETE')).status, 200);
        assert.equal(f.pets.length, 3);
        assert.deepEqual(f.pets[0], { ...before, available: false });
        const { pet } = await (await f.request('/1')).json();
        assert.equal(pet.available, false);
        assert.equal(pet.pet_name, before.pet_name);
        const managed = (await (await f.request('/manage')).json()).pets;
        assert.equal(managed.find((item: any) => item.id === '1').available, false);
        assert.equal((await f.request('/1', 'DELETE')).status, 200);
        assert.equal(f.pets.length, 3);
        assert.deepEqual(f.writes, ['update', 'update']);
    } finally { await f.close(); }
});

test('removal rejects unauthorized users and invalid or missing listings', async () => {
    const f = await fixture();
    try {
        assert.equal((await f.request('/1', 'DELETE', undefined, '')).status, 401);
        assert.equal((await f.request('/1', 'DELETE', undefined, 'ordinary-user')).status, 403);
        assert.equal((await f.request('/2', 'DELETE')).status, 403);
        assert.equal((await f.request('/0', 'DELETE')).status, 400);
        assert.equal((await f.request('/9223372036854775808', 'DELETE')).status, 400);
        assert.equal((await f.request('/999', 'DELETE')).status, 404);
        assert.deepEqual(f.writes, []);
        assert.equal(f.pets[0].available, true);
        assert.equal(f.pets[1].available, true);
    } finally { await f.close(); }
});


test('public browsing shows available pets and hides a pet after removal', async () => {
    const f = await fixture();
    try {
        const before = await f.request('/', 'GET', undefined, '');
        assert.equal(before.status, 200);
        const { pets } = await before.json();
        assert.deepEqual(pets.map((pet: any) => pet.id), ['1', '2']);
        assert.equal(pets[0].pet_name, 'Rex');
        assert.equal(pets[0].photo_paths, undefined);
        assert.equal(pets[0].shelter_id, undefined);
        assert.equal((await f.request('/1', 'DELETE')).status, 200);
        const after = await (await f.request('/', 'GET', undefined, '')).json();
        assert.deepEqual(after.pets.map((pet: any) => pet.id), ['2']);
        assert.equal((await f.request('/1')).status, 200);
    } finally { await f.close(); }
});

test('browse pages return up to 24 pets and indicate when there are no more', async () => {
    const f = await fixture();
    try {
        for (let id = 4; id < 32; id++) f.pets.push({ ...f.pets[0], id });
        const first = await (await f.request('/')).json();
        assert.equal(first.pets.length, 24);
        assert.equal(first.nextOffset, 24);
        const second = await (await f.request('/?offset=24')).json();
        assert.equal(second.pets.length, 6);
        assert.equal(second.nextOffset, null);
        assert.equal(first.pets.some((pet: any) => second.pets.some((item: any) => item.id === pet.id)), false);
        for (const offset of ['-1', 'abc', '1.5']) assert.equal((await f.request(`/?offset=${offset}`)).status, 400);
        f.pets.forEach(pet => { pet.available = false; });
        assert.deepEqual(await (await f.request('/')).json(), { pets: [], nextOffset: null });
    } finally { await f.close(); }
});

test('browse cards receive a signed cover photo without internal storage paths', async () => {
    const f = await fixture();
    try {
        const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
        const { path } = await (await f.request('/photos', 'POST', { shelter_id: '1', content_type: 'image/png', data: png })).json();
        assert.equal((await f.request('/1', 'PUT', { pet_name: 'Rex', species: 'Dog', shelter_id: '1', photo_paths: [path] })).status, 200);
        const pet = (await (await f.request('/', 'GET', undefined, '')).json()).pets.find((item: any) => item.id === '1');
        assert.equal(pet.photos.length, 1);
        assert.ok(pet.photos[0].includes(path));
        assert.equal(pet.photo_paths, undefined);
    } finally { await f.close(); }
});

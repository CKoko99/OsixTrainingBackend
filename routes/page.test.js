import request from 'supertest'
import app from '../index.js' // Import your Express app here

describe('GET /page/:link', () => {
    it('should return the correct page data when found in memory', async () => {
        // Simulate data in memory for testing
        const link = 'example-link';
        const pageData = {
            [link]: { section: 'example-section', time: Date.now() },
        };

        // Mock the data in memory
        jest.spyOn(global, 'pageData', 'get').mockReturnValue(pageData);

        const response = await request(app).get(`/${link}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual(pageData[link]);
    });

    it('should fetch data from Firestore if not found in memory', async () => {
        const link = 'example-link';
        const section = 'example-section';

        // Mock Firestore query
        jest.spyOn(Firestore.prototype, 'getDocs').mockResolvedValueOnce([
            {
                data: () => ({ section }),
            },
        ]);

        const response = await request(app).get(`/${link}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ section });
    });

    it('should return a 404 status if page data is not found', async () => {
        const link = 'non-existent-link';

        // Mock Firestore query to return an empty result
        jest.spyOn(Firestore.prototype, 'getDocs').mockResolvedValueOnce([]);

        const response = await request(app).get(`/${link}`);

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: 'Page not found' });
    });
});

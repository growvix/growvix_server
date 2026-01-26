import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3000/api';

const runTest = async () => {
    // 1. Register User
    const uniqueId = uuidv4().slice(0, 8);
    const registerData = {
        phoneNumber: "1234567890",
        organization: "org-" + uniqueId,
        profile: {
            firstName: "Test",
            lastName: "User",
            email: `test-${uniqueId}@example.com`,
            phone: "0987-654-321",
            profileImagePath: "https://example.com/avatar.jpg"
        },
        password: "password123"
    };

    console.log('🔹 1. Registering User...');
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
    });

    const registerResult = await registerResponse.json();
    console.log('Status:', registerResponse.status);
    console.log('Response:', JSON.stringify(registerResult, null, 2));

    if (!registerResult.success) {
        console.error('❌ Registration failed');
        return;
    }

    const token = registerResult.data.token;
    const userId = registerResult.data.user._id;

    console.log(`\n✅ Registered User ID: ${userId} (Should be UUID)`);

    // 2. Login User
    console.log('\n🔹 2. Logging In...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: registerData.profile.email,
            password: registerData.password
        })
    });

    const loginResult = await loginResponse.json();
    console.log('Status:', loginResponse.status);
    console.log('Response:', JSON.stringify(loginResult, null, 2));

    // 3. Get Me Profile
    console.log('\n🔹 3. Fetching My Profile...');
    const meResponse = await fetch(`${BASE_URL}/users/me`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    const meResult = await meResponse.json();
    console.log('Status:', meResponse.status);
    console.log('Response:', JSON.stringify(meResult, null, 2));

    if (meResult.success && meResult.data._id === userId) {
        console.log('\n✅ Profile Fetch Success and ID matches!');
    } else {
        console.error('\n❌ Profile Fetch Failed or ID mismatch');
    }
};

runTest().catch(console.error);

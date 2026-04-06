import mongoose from 'mongoose';
import { User } from './src/models/user.model.js';
import { getOrganizationConnection } from './src/config/multiTenantDb.js';
import { getClientUserModel } from './src/models/clientUser.model.js';
import { env } from './src/config/index.js';

async function test() {
    await mongoose.connect(env.MONGO_URI);
    console.log("Global DB connected");
    
    // Check global users for testorg
    const globalCount = await User.countDocuments({ organization: 'testorg' });
    console.log("Global users for testorg:", globalCount);
    
    // Check local
    const orgConn = await getOrganizationConnection('testorg');
    const ClientUser = getClientUserModel(orgConn);
    const localCount = await ClientUser.countDocuments();
    console.log("Local users for testorg:", localCount);
    
    await mongoose.disconnect();
    await orgConn.close();
}

test().catch(console.error);

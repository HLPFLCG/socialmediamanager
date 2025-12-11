const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class User {
    constructor(db) {
        this.collection = db.collection('users');
    }

    // Register a new user
    async register(userData) {
        try {
            const { email, password, name, company } = userData;

            // Check if user already exists
            const existingUser = await this.collection.findOne({ email });
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user document
            const user = {
                email,
                password: hashedPassword,
                name: name || email.split('@')[0],
                company: company || '',
                role: 'user',
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                settings: {
                    timezone: 'UTC',
                    language: 'en',
                    notifications: true
                },
                subscription: {
                    plan: 'free',
                    status: 'active',
                    limits: {
                        posts: 100,
                        accounts: 3,
                        scheduledPosts: 10
                    }
                }
            };

            const result = await this.collection.insertOne(user);
            
            // Remove password from response
            delete user.password;
            user._id = result.insertedId;

            // Generate JWT token
            const token = this.generateToken(user);

            return { user, token };
        } catch (error) {
            throw error;
        }
    }

    // Login user
    async login(email, password) {
        try {
            // Find user by email
            const user = await this.collection.findOne({ email, isActive: true });
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Compare password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Remove password from response
            delete user.password;

            // Generate JWT token
            const token = this.generateToken(user);

            // Update last login
            await this.collection.updateOne(
                { _id: user._id },
                { $set: { lastLogin: new Date(), updatedAt: new Date() } }
            );

            return { user, token };
        } catch (error) {
            throw error;
        }
    }

    // Get user by ID
    async getById(userId) {
        try {
            const user = await this.collection.findOne({ _id: new ObjectId(userId), isActive: true });
            if (!user) {
                throw new Error('User not found');
            }
            delete user.password;
            return user;
        } catch (error) {
            throw error;
        }
    }

    // Get user by email
    async getByEmail(email) {
        try {
            const user = await this.collection.findOne({ email, isActive: true });
            if (!user) {
                throw new Error('User not found');
            }
            delete user.password;
            return user;
        } catch (error) {
            throw error;
        }
    }

    // Update user profile
    async update(userId, updateData) {
        try {
            const allowedUpdates = ['name', 'company', 'settings'];
            const updates = {};
            
            Object.keys(updateData).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    updates[key] = updateData[key];
                }
            });

            updates.updatedAt = new Date();

            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: updates }
            );

            if (result.matchedCount === 0) {
                throw new Error('User not found');
            }

            return await this.getById(userId);
        } catch (error) {
            throw error;
        }
    }

    // Change password
    async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await this.collection.findOne({ _id: new ObjectId(userId) });
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Update password
            await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        password: hashedPassword,
                        updatedAt: new Date()
                    }
                }
            );

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Delete user (soft delete)
    async delete(userId) {
        try {
            const result = await this.collection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        isActive: false,
                        deletedAt: new Date(),
                        updatedAt: new Date()
                    }
                }
            );

            if (result.matchedCount === 0) {
                throw new Error('User not found');
            }

            return { success: true };
        } catch (error) {
            throw error;
        }
    }

    // Generate JWT token
    generateToken(user) {
        const payload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        };

        return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
            expiresIn: '7d'
        });
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        } catch (error) {
            throw new Error('Invalid token');
        }
    }

    // Get user stats
    async getStats(userId) {
        try {
            const postsCollection = this.collection.s.db.collection('posts');
            const accountsCollection = this.collection.s.db.collection('socialaccounts');

            const [totalPosts, scheduledPosts, connectedAccounts] = await Promise.all([
                postsCollection.countDocuments({ userId: new ObjectId(userId) }),
                postsCollection.countDocuments({ 
                    userId: new ObjectId(userId), 
                    status: 'scheduled' 
                }),
                accountsCollection.countDocuments({ 
                    userId: new ObjectId(userId), 
                    isActive: true 
                })
            ]);

            return {
                totalPosts,
                scheduledPosts,
                publishedPosts: totalPosts - scheduledPosts,
                connectedAccounts
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = User;
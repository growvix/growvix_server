import mongoose, { Schema } from 'mongoose';

// Unit Schema - Individual apartments/flats
const UnitSchema = new Schema({
    unitId: { type: String, required: true },        // e.g., "101", "1A", "A-101"
    unitNumber: { type: String, required: true },    // Display number
    bhk: { type: Number },                           // 1, 2, 3, etc.
    bathrooms: { type: Number, default: 2 },         // Number of bathrooms
    size: { type: Number },                          // Square feet
    facing: { type: String },                        // 'East', 'West', 'North', 'South'
    unitType: { type: String },                      // e.g., "Type A", "Type B"
    status: {
        type: String,
        enum: ['available', 'booked', 'sold'],
        default: 'available'
    },
    price: { type: Number },
    position: {
        row: { type: Number },
        col: { type: Number }
    }
}, { _id: false });

// Floor Schema - Contains units
const FloorSchema = new Schema({
    floorNumber: { type: Number, required: true },   // 1, 2, 3, etc.
    floorName: { type: String },                     // "1st Floor", "Ground Floor"
    units: [UnitSchema]
}, { _id: false });

// Block Schema - Contains floors and floor plan images
const BlockSchema = new Schema({
    blockId: { type: String, required: true },       // e.g., "A", "B", "Tower-1"
    blockName: { type: String, required: true },     // e.g., "Block A", "Tower 1"
    totalFloors: { type: Number, required: true },
    floorPlanImages: [{                              // Up to 5 image URLs per block
        type: String
    }],
    floors: [FloorSchema]
}, { _id: false });

// Plot Schema - For plots property type
const PlotSchema = new Schema({
    plotId: { type: String, required: true },       // e.g., "plot-1", "plot-A"
    plotNumber: { type: String, required: true },   // Display number: "1", "A", etc.
    size: { type: Number },                          // Square feet
    facing: { type: String },                        // Direction
    status: {
        type: String,
        enum: ['available', 'booked', 'sold'],
        default: 'available'
    },
    price: { type: Number }
}, { _id: false });

// Main Project Schema
const ProjectSchema = new Schema(
    {
        product_id: { type: Number, required: true, unique: true },
        organization: { type: String, required: true, index: true },
        property: {
            type: String,
            enum: ['apartments', 'villas', 'plots', 'commercial'],
            default: 'apartments'
        },
        name: { type: String, required: true },
        location: { type: String },
        img_location: {
            logo: { type: String },
            banner: { type: String },
            brochure: { type: String },
            post: { type: String },
            videos: { type: String },
        },
        preferred: [{ type: String }],
        // Apartment/Villa/Commercial Inventory Fields
        blocks: [BlockSchema],
        // Plots Inventory Fields
        plots: [PlotSchema],
        plotNumberPattern: { type: String, enum: ['numeric', 'alpha', 'custom'], default: 'numeric' },
        layoutImages: [{ type: String }], // Site layout images for plots
    },
    {
        timestamps: true,
        collection: 'projects',
    }
);

// Indexes for faster queries
ProjectSchema.index({ organization: 1, product_id: 1 });
ProjectSchema.index({ organization: 1, name: 1 });

export const getProjectModel = (connection) => {
    if (connection.models.Project) {
        return connection.models.Project;
    }
    return connection.model('Project', ProjectSchema);
};

import { StyleSheet, Dimensions, Platform } from 'react-native'; // Import Platform for OS-specific shadows

// Define a base unit for consistent spacing and sizing
const SPACING_UNIT = 8;
const BORDER_RADIUS_BASE = 12; // Slightly larger for a modern feel
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.1)'; // Softer shadow color

export const styles = StyleSheet.create({
    // --- General Containers & Layout ---

    searchContainer: {
        position: 'absolute',
        top: Dimensions.get('window').height * 0.06, // Dynamic top position, consistent with animated view
        left: SPACING_UNIT * 2, // 16 units from left
        right: SPACING_UNIT * 2, // 16 units from right
        zIndex: 10,
        // Removed background/shadow here, as it's better applied to specific elements like inputs
        // This container just defines the overall position of the search UI
        // Adding a slight top padding for breathing room if the animated view starts right at the top
        paddingTop: SPACING_UNIT * 2,
    },

    floatingBtnContainer: {
        position: 'absolute',
        left: SPACING_UNIT * 2, // Consistent with searchContainer
        right: SPACING_UNIT * 2, // Consistent with searchContainer
        // `bottom` will be handled by safe area insets in the component
        alignItems: 'center', // Center the button horizontally
        paddingBottom: SPACING_UNIT * 2, // Padding from bottom
        zIndex: 5, // Ensure it's above WebView but potentially below the animated view
    },

    // --- Input Fields ---
    input: {
        backgroundColor: '#FFFFFF', // Pure white for crispness
        paddingVertical: SPACING_UNIT * 1.5, // Taller input for better touch target
        paddingHorizontal: SPACING_UNIT * 2,
        borderRadius: BORDER_RADIUS_BASE, // Consistent rounded corners
        marginBottom: SPACING_UNIT, // Consistent spacing between inputs
        marginRight: 0, // Removed margin-right, inputs typically stack vertically
        // Softer, more pronounced shadow for inputs
        ...Platform.select({
            ios: {
                shadowColor: SHADOW_COLOR,
                shadowOffset: { width: 0, height: 4 }, // Increased shadow spread
                shadowOpacity: 0.2, // Slightly more opaque
                shadowRadius: 8, // Larger blur radius
            },
            android: {
                elevation: 5, // Android elevation for shadow
            },
        }),
        fontSize: 16, // Good default font size
        color: '#333333', // Darker text for readability
        // Added border for visual separation even without shadow on Android if elevation is low
        borderWidth: StyleSheet.hairlineWidth, // Very thin border
        borderColor: '#E0E0E0', // Light gray border
    },

    // --- Suggestions List ---
    suggestionsList: {
        backgroundColor: '#FFFFFF', // Pure white
        borderRadius: BORDER_RADIUS_BASE, // Consistent rounded corners
        // Shadow for the whole suggestion list card
        ...Platform.select({
            ios: {
                shadowColor: SHADOW_COLOR,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 5,
            },
        }),
        overflow: 'hidden', // Ensures rounded corners are visible for children
        marginTop: SPACING_UNIT, // Space between last input and suggestions
        // maxHeight is good for preventing it from taking up too much screen
        // Ensure this plays well with the Animated.View's maxHeight
        maxHeight: Dimensions.get('window').height * 0.35, // Slightly increased from 0.3
    },
    suggestion: {
        paddingVertical: SPACING_UNIT * 1.5, // More vertical padding
        paddingHorizontal: SPACING_UNIT * 2, // Consistent horizontal padding
        borderBottomWidth: StyleSheet.hairlineWidth, // Very thin separator
        borderColor: '#F0F0F0', // Lighter separator color
        fontSize: 16,
        color: '#444444',
    },
    // To remove the last suggestion's bottom border
    lastSuggestion: {
        borderBottomWidth: 0,
    },

    // --- Slider Container ---
    sliderContainer: {
        backgroundColor: '#FFFFFF',
        padding: SPACING_UNIT * 2, // Consistent padding
        borderRadius: BORDER_RADIUS_BASE,
        // Softer shadow for the slider card
        ...Platform.select({
            ios: {
                shadowColor: SHADOW_COLOR,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
            },
            android: {
                elevation: 3,
            },
        }),
        marginHorizontal: 0, // Removed this to align with inputs if searchContainer handles margin
        marginBottom: SPACING_UNIT * 2, // More space below the slider
        marginTop: SPACING_UNIT, // Space above slider from inputs
    },
    // Optional: Add styling for the slider text if needed, e.g.,
    sliderText: {
        fontSize: 14,
        color: '#666666',
        marginBottom: SPACING_UNIT,
        textAlign: 'center', // Center the text for better visual balance
    },

    // --- Floating Buttons ---
    floatingButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40, // Adjust for iOS safe area if needed
        right: SPACING_UNIT * 2, // Consistent spacing from right
        zIndex: 10,
        // Button component itself usually handles styling, but if it's a wrapper:
        ...Platform.select({
            ios: {
                shadowColor: SHADOW_COLOR,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
            },
            android: {
                elevation: 4,
            },
        }),
    },

    animatedCard: {
        marginHorizontal: SPACING_UNIT * 2, // Use consistent horizontal margin
        // Background and shadow for the animated panel itself if it's a card-like element
        backgroundColor: '#FFFFFF',
        borderRadius: BORDER_RADIUS_BASE,
        ...Platform.select({
            ios: {
                shadowColor: SHADOW_COLOR,
                shadowOffset: { width: 0, height: 5 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
        }),
        // Add padding if this card wraps content directly
        padding: SPACING_UNIT * 2,
    },

    togglePanel: {
        position: 'absolute',
        bottom: SPACING_UNIT * 10, // Adjust based on your floating button container
        left: SPACING_UNIT * 2,
        right: SPACING_UNIT * 2,
        zIndex: 20,
        // If this is a panel that pops up, give it a background/shadow
        backgroundColor: '#FFFFFF',
        borderRadius: BORDER_RADIUS_BASE,
        padding: SPACING_UNIT * 2,
        ...Platform.select({
            ios: {
                shadowColor: SHADOW_COLOR,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 5,
            },
        }),
    },

    // You might also consider these if they are used
    buttonText: {
        fontSize: 16,
        fontWeight: '600', // Semi-bold for buttons
    },
    buttonContainer: {
        borderRadius: BORDER_RADIUS_BASE,
        overflow: 'hidden', // Ensures button background respects border-radius
    },
});
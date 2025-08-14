# 🤝 Contributing to 0G Galileo Explorer

Thank you for your interest in contributing to 0G Galileo Explorer! We welcome contributions from the community and are grateful for any help you can provide.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Component Guidelines](#component-guidelines)
- [API Development](#api-development)
- [Testing](#testing)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)

## 📜 Code of Conduct

### Our Pledge
We pledge to make participation in our project a harassment-free experience for everyone. We expect all contributors to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other contributors

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Trolling or insulting comments
- Public or private harassment
- Publishing others' private information

## 🚀 Getting Started

### 1. Fork and Clone
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/0g-galileo-explorer.git
cd 0g-galileo-explorer

# Add upstream remote
git remote add upstream https://github.com/coinsspor/0g-galileo-explorer.git
```

### 2. Setup Development Environment
```bash
# Install all dependencies
npm run install:all

# Start development servers
npm run start:all
```

### 3. Create a Branch
```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

## 📁 Project Structure

```
0g-galileo-explorer/
├── frontend/                    # React + TypeScript frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── App.tsx        # Main application
│   │   │   ├── ManageDelegation.tsx  # Delegation management
│   │   │   ├── UptimeGrid.tsx        # Uptime visualization
│   │   │   ├── Header.tsx            # App header
│   │   │   ├── StatCard.tsx          # Statistics cards
│   │   │   └── ValidatorCard.tsx     # Validator cards
│   │   ├── styles/            # CSS files
│   │   └── main.tsx           # Entry point
│   ├── public/                # Static assets
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts         # Vite configuration
│   └── tsconfig.json          # TypeScript config
│
├── backend/
│   ├── api-validator/         # Port 3001 - Main validator API
│   │   ├── server.js         # 6-layer validator detection
│   │   └── package.json
│   │
│   ├── api-blockchain/        # Port 3002 - Blockchain stats
│   │   ├── server.js         # Entry point
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── blockchainService.js
│   │   │   ├── rpcService.js
│   │   │   └── cacheService.js
│   │   ├── middleware/       # Express middleware
│   │   ├── utils/            # Utilities
│   │   └── config/           # Configuration
│   │
│   └── api-uptime/           # Port 3004 - Uptime tracking
│       ├── server.js         # 100-block analysis
│       └── package.json
│
├── docs/                      # Documentation
├── scripts/                   # Build and deployment scripts
└── README.md
```

## 💻 Development Workflow

### Frontend Development

#### Component Development
```typescript
// src/components/NewComponent.tsx
import React, { useState, useEffect } from 'react';

interface NewComponentProps {
  // Define props with TypeScript
  data: any;
  onAction: (value: any) => void;
}

const NewComponent: React.FC<NewComponentProps> = ({ data, onAction }) => {
  // Component logic
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default NewComponent;
```

#### State Management
- Use React hooks (useState, useEffect, etc.)
- Keep state as local as possible
- Lift state up when needed for sharing

#### Styling Guidelines
- Use inline styles or CSS modules
- Follow the existing gradient theme (#667eea to #764ba2)
- Ensure mobile responsiveness
- Use glass morphism effects for cards

### Backend Development

#### API Endpoint Creation
```javascript
// Example: New endpoint in api-validator/server.js

app.get('/api/new-endpoint/:param', async (req, res) => {
    try {
        const { param } = req.params;
        
        // Validation
        if (!ethers.isAddress(param)) {
            return res.status(400).json({
                success: false,
                error: "Invalid address"
            });
        }
        
        // Business logic
        const result = await processData(param);
        
        // Response
        res.json({
            success: true,
            data: result
        });
        
    } catch (error) {
        logToFile(`❌ Endpoint error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
```

#### Service Development
```javascript
// services/newService.js
class NewService {
    constructor() {
        this.cache = new Map();
    }
    
    async fetchData() {
        // Implementation
    }
    
    // Always include error handling
    async processData(input) {
        try {
            // Processing logic
            return result;
        } catch (error) {
            logger.error('Processing failed', { error });
            throw error;
        }
    }
}

module.exports = new NewService();
```

## 📏 Coding Standards

### TypeScript/JavaScript

#### Naming Conventions
```typescript
// Components: PascalCase
const ValidatorCard = () => {};

// Functions: camelCase
const calculateUptime = () => {};

// Constants: UPPER_SNAKE_CASE
const MAX_VALIDATORS = 100;

// Interfaces: PascalCase with 'I' prefix (optional)
interface IValidator {
    address: string;
    moniker: string;
}
```

#### Code Style
```javascript
// Use async/await over promises
// ✅ Good
async function fetchData() {
    try {
        const data = await api.get('/endpoint');
        return data;
    } catch (error) {
        console.error(error);
    }
}

// ❌ Avoid
function fetchData() {
    return api.get('/endpoint')
        .then(data => data)
        .catch(error => console.error(error));
}

// Use destructuring
const { address, moniker } = validator;

// Use template literals
const message = `Validator ${moniker} at ${address}`;
```

#### Comments and Documentation
```javascript
/**
 * Calculates validator uptime percentage
 * @param {string} validatorAddress - The validator's address
 * @param {number} blockRange - Number of blocks to analyze
 * @returns {Promise<number>} Uptime percentage (0-100)
 */
async function calculateValidatorUptime(validatorAddress, blockRange) {
    // Single-line comments for logic explanation
    // Multi-line for complex explanations
}
```

### React Components

#### Component Structure
```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { ComponentDependency } from './ComponentDependency';

// 2. TypeScript interfaces
interface ComponentProps {
    prop1: string;
    prop2: number;
}

// 3. Component definition
const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
    // 4. State declarations
    const [state, setState] = useState(initialValue);
    
    // 5. Effects
    useEffect(() => {
        // Effect logic
    }, [dependencies]);
    
    // 6. Event handlers
    const handleClick = () => {
        // Handler logic
    };
    
    // 7. Render helpers
    const renderContent = () => {
        return <div>Content</div>;
    };
    
    // 8. Main render
    return (
        <div>
            {renderContent()}
        </div>
    );
};

// 9. Export
export default Component;
```

#### Hooks Best Practices
```typescript
// Custom hooks in separate files
// hooks/useValidatorData.ts
export const useValidatorData = (address: string) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchValidatorData(address)
            .then(setData)
            .finally(() => setLoading(false));
    }, [address]);
    
    return { data, loading };
};
```

## 🧪 Testing

### Unit Testing
```javascript
// __tests__/validator.test.js
describe('Validator Detection', () => {
    test('should detect valid validator', async () => {
        const address = '0x...';
        const result = await testValidatorAddress(address);
        expect(result.isValid).toBe(true);
    });
    
    test('should reject invalid address', async () => {
        const address = 'invalid';
        const result = await testValidatorAddress(address);
        expect(result.isValid).toBe(false);
    });
});
```

### Integration Testing
```javascript
// Test API endpoints
describe('API Endpoints', () => {
    test('GET /api/validators returns list', async () => {
        const response = await request(app)
            .get('/api/validators')
            .expect(200);
        
        expect(response.body).toHaveProperty('validators');
        expect(Array.isArray(response.body.validators)).toBe(true);
    });
});
```

### Frontend Testing
```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import ValidatorCard from '../ValidatorCard';

test('renders validator information', () => {
    const validator = {
        moniker: 'Test Validator',
        address: '0x123...',
        votingPower: 100
    };
    
    render(<ValidatorCard validator={validator} />);
    expect(screen.getByText('Test Validator')).toBeInTheDocument();
});
```

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for all functions
- Document complex algorithms
- Include examples for utility functions

### README Updates
When adding features:
1. Update feature list
2. Add usage examples
3. Update screenshots if UI changes
4. Document new environment variables

### API Documentation
When adding endpoints:
1. Update `docs/API_DOCUMENTATION.md`
2. Include request/response examples
3. Document error codes
4. Add rate limiting information

## 🔄 Submitting Changes

### Commit Message Format
```bash
# Format: <type>(<scope>): <subject>

feat(frontend): add validator search functionality
fix(api): resolve memory leak in cache service
docs(readme): update installation instructions
style(frontend): improve mobile responsiveness
refactor(backend): optimize validator detection
test(api): add unit tests for delegation endpoints
chore(deps): update dependencies
```

### Pull Request Process

#### 1. Before Submitting
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Update documentation
- [ ] Test on local environment
- [ ] Check for console.log statements
- [ ] Verify no sensitive data exposed

#### 2. PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if UI changes)
[Add screenshots here]

## Checklist
- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

#### 3. Review Process
1. Submit PR with clear description
2. Address reviewer feedback
3. Ensure CI/CD passes
4. Squash commits if requested
5. Merge after approval

## 🎯 Areas for Contribution

### High Priority
- [ ] Add comprehensive test coverage
- [ ] Implement WebSocket for real-time updates
- [ ] Add GraphQL API
- [ ] Improve error handling
- [ ] Add i18n support

### Good First Issues
- [ ] Add loading animations
- [ ] Improve mobile responsiveness  
- [ ] Fix typos in documentation
- [ ] Add input validation
- [ ] Improve error messages

### Feature Requests
- [ ] Dark/Light theme toggle
- [ ] Export functionality (CSV/PDF)
- [ ] Advanced search filters
- [ ] Multi-language support
- [ ] API rate limiting dashboard

## 🏆 Recognition

Contributors will be:
- Listed in README.md
- Mentioned in release notes
- Given credit in commits

## 💡 Tips for Contributors

### Performance Considerations
- Minimize API calls
- Use caching effectively
- Optimize React re-renders
- Lazy load components
- Use pagination for large lists

### Security Best Practices
- Validate all inputs
- Sanitize user data
- Use parameterized queries
- Never expose sensitive data
- Follow OWASP guidelines

### Accessibility
- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast ratios

## 📞 Getting Help

If you need help:
1. Check existing documentation
2. Search closed issues
3. Ask in Discord channel
4. Open an issue with [QUESTION] tag

## 🐛 Reporting Issues

When reporting bugs:
1. Search existing issues first
2. Use issue template
3. Include reproduction steps
4. Add environment details
5. Attach screenshots/logs

### Issue Template
```markdown
**Describe the bug**
Clear description of the issue

**To Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What should happen

**Screenshots**
If applicable

**Environment:**
- OS: [e.g., Ubuntu 20.04]
- Node version: [e.g., 18.0.0]
- Browser: [e.g., Chrome 100]
```

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Thank you for contributing to 0G Galileo Explorer! Your efforts help make this project better for everyone in the 0G community.

---

**Questions?** Reach out on Discord or open an issue!
**Ready to contribute?** Pick an issue and start coding! 🚀

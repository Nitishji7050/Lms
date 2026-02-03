const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    console.log(`[Auth] User role: ${req.user.role}, Required: [${roles.join(', ')}]`);
    
    if (!roles.includes(req.user.role)) {
      console.log(`[Auth] Access denied - role "${req.user.role}" not in [${roles.join(', ')}]`);
      return res.status(403).json({ message: 'Access denied' });
    }
    
    next();
  };
};

module.exports = { auth, authorize };

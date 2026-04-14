// app/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FaEnvelope, 
  FaLock, 
  FaUser, 
  FaBuilding, 
  FaIdCard, 
  FaMapMarkerAlt, 
  FaSpinner,
  FaPhone,
  FaCity,
  FaGlobe,
  FaCheckCircle,
  FaArrowLeft,
  FaShieldAlt,
  FaEye,
  FaEyeSlash,
  FaSearch,
  FaExclamationCircle,
  FaChevronDown,
  FaTimes
} from 'react-icons/fa';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  company?: string;
  tax_id?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    company: '',
    tax_id: '',
    state: '',
    city: '',
    postal_code: '',
    country: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [searchCountry, setSearchCountry] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  
  const { register } = useAuth();
  const router = useRouter();

  // Fetch all countries
  useEffect(() => {
    const fetchAllCountries = async () => {
      try {
        setLoadingCountries(true);
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flags');
        
        if (!response.ok) throw new Error('Failed to fetch countries');
        
        const data = await response.json();
        
        const allCountries: Country[] = data
          .filter((country: any) => 
            country.cca2 && 
            country.name?.common && 
            country.idd?.root &&
            country.flags?.svg
          )
          .map((country: any) => {
            let dialCode = country.idd.root;
            if (country.idd.suffixes?.length > 0) {
              dialCode += country.idd.suffixes[0];
            }
            return {
              code: country.cca2,
              name: country.name.common,
              dialCode: dialCode,
              flag: country.flags.svg,
            };
          })
          .sort((a: Country, b: Country) => a.name.localeCompare(b.name));
        
        setCountries(allCountries);
        
        // Set default country to India
        const india = allCountries.find(c => c.code === 'IN');
        if (india) {
          setFormData(prev => ({ ...prev, country: india.code }));
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error);
        setError('Failed to load countries. Please refresh.');
      } finally {
        setLoadingCountries(false);
      }
    };

    fetchAllCountries();
  }, []);

  // Validate form on change
  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const errors: FormErrors = {};

    // Personal Information
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-+()]{10,15}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!formData.country) {
      errors.country = 'Country is required';
    }

    // Business Information
    if (!formData.company.trim()) {
      errors.company = 'Company name is required';
    }

    if (!formData.tax_id.trim()) {
      errors.tax_id = 'GST/Tax ID is required';
    } else if (formData.tax_id.trim().length < 5) {
      errors.tax_id = 'Please enter a valid tax ID';
    }

    if (!formData.state.trim()) {
      errors.state = 'State is required';
    }

    if (!formData.city.trim()) {
      errors.city = 'City is required';
    }

    if (!formData.postal_code.trim()) {
      errors.postal_code = 'Postal code is required';
    } else if (!/^[0-9]{5,10}$/.test(formData.postal_code)) {
      errors.postal_code = 'Please enter a valid postal code';
    }

    // Security
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/)) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[@$!%*?&#]/)) strength++;
    setPasswordStrength(strength);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchCountry.toLowerCase()) ||
    country.code.toLowerCase().includes(searchCountry.toLowerCase()) ||
    country.dialCode.includes(searchCountry)
  );

  const selectedCountry = countries.find(c => c.code === formData.country);

  const getStepStatus = (step: number) => {
    if (currentStep > step) return 'completed';
    if (currentStep === step) return 'current';
    return 'pending';
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return formData.name.trim() && 
               formData.email.trim() && 
               /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
               formData.phone.trim() && 
               formData.country;
      case 2:
        return formData.company.trim() && 
               formData.tax_id.trim() && 
               formData.state.trim() && 
               formData.city.trim() && 
               formData.postal_code.trim();
      case 3:
        return formData.password.length >= 8 && 
               formData.password === formData.confirmPassword &&
               passwordStrength >= 3;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Mark all fields in current step as touched
      const fieldsToTouch: string[] = [];
      if (currentStep === 1) {
        fieldsToTouch.push('name', 'email', 'phone', 'country');
      } else if (currentStep === 2) {
        fieldsToTouch.push('company', 'tax_id', 'state', 'city', 'postal_code');
      }
      fieldsToTouch.forEach(field => setTouched(prev => ({ ...prev, [field]: true })));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Mark all fields as touched
    const allFields = ['name', 'email', 'phone', 'country', 'company', 'tax_id', 'state', 'city', 'postal_code', 'password', 'confirmPassword'];
    allFields.forEach(field => setTouched(prev => ({ ...prev, [field]: true })));

    if (!validateForm()) {
      setError('Please fill in all required fields correctly');
      return;
    }

    if (passwordStrength < 3) {
      setError('Please choose a stronger password');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        company: formData.company,
        tax_id: formData.tax_id,
        state: formData.state,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
      });
      
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Info', icon: FaUser },
    { number: 2, title: 'Business Info', icon: FaBuilding },
    { number: 3, title: 'Security', icon: FaShieldAlt },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 py-6 px-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="max-w-3xl mx-auto relative">
        {/* Back to Home */}
        <button
          onClick={() => router.push('/')}
          className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition group"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Back to Home</span>
        </button>

        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative p-6 pb-0 text-center">
            <div className="inline-flex items-center justify-center mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-xl opacity-50" />
                <Image 
                  src="/logo.png"
                  alt="eBliss Logo"
                  width={60}
                  height={60}
                  className="relative rounded-xl object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Create Your Account
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              All fields are required to complete registration
            </p>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step.number);
                const StepIcon = step.icon;
                
                return (
                  <div key={step.number} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${status === 'completed' ? 'bg-green-500 text-white' :
                          status === 'current' ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20' :
                          'bg-slate-700 text-slate-500'}
                      `}>
                        {status === 'completed' ? (
                          <FaCheckCircle className="w-5 h-5" />
                        ) : (
                          <StepIcon className="w-5 h-5" />
                        )}
                      </div>
                      <span className={`
                        text-xs mt-1 font-medium
                        ${status === 'current' ? 'text-indigo-400' :
                          status === 'completed' ? 'text-green-400' : 'text-slate-500'}
                      `}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`
                        flex-1 h-0.5 mx-2
                        ${status === 'completed' ? 'bg-green-500' : 'bg-slate-700'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                      <FaUser className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Personal Information</h2>
                    <span className="text-xs text-red-400 ml-auto">All fields required</span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Full Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaUser className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.name && formErrors.name ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          onBlur={() => handleBlur('name')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.name && formErrors.name 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-indigo-500/50 focus:border-indigo-500'
                          }`}
                          placeholder="John Doe"
                        />
                      </div>
                      {touched.name && formErrors.name && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Email Address <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaEnvelope className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.email && formErrors.email ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={() => handleBlur('email')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.email && formErrors.email 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-indigo-500/50 focus:border-indigo-500'
                          }`}
                          placeholder="you@example.com"
                        />
                      </div>
                      {touched.email && formErrors.email && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Phone Number <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaPhone className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.phone && formErrors.phone ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          onBlur={() => handleBlur('phone')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.phone && formErrors.phone 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-indigo-500/50 focus:border-indigo-500'
                          }`}
                          placeholder="+919876543210"
                        />
                      </div>
                      {touched.phone && formErrors.phone && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Country <span className="text-red-400">*</span>
                      </label>
                      {loadingCountries ? (
                        <div className="flex items-center justify-center py-3 bg-slate-900 border border-slate-700 rounded-xl">
                          <FaSpinner className="w-4 h-4 text-indigo-400 animate-spin" />
                          <span className="ml-2 text-sm text-slate-400">Loading countries...</span>
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                            onBlur={() => handleBlur('country')}
                            className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-left flex items-center justify-between transition-all ${
                              touched.country && formErrors.country 
                                ? 'border-red-500' 
                                : 'border-slate-700'
                            }`}
                          >
                            <span className={selectedCountry ? 'text-white' : 'text-slate-500'}>
                              {selectedCountry ? (
                                <span className="flex items-center gap-2">
                                  <img src={selectedCountry.flag} alt="" className="w-5 h-4 object-cover rounded" />
                                  {selectedCountry.name} ({selectedCountry.dialCode})
                                </span>
                              ) : (
                                'Select a country'
                              )}
                            </span>
                            <FaChevronDown className={`text-slate-500 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {showCountryDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 max-h-64 overflow-hidden">
                              <div className="p-2 border-b border-slate-700">
                                <div className="relative">
                                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                                  <input
                                    type="text"
                                    placeholder="Search country..."
                                    value={searchCountry}
                                    onChange={(e) => setSearchCountry(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                              <div className="max-h-52 overflow-y-auto">
                                {filteredCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, country: country.code }));
                                      setShowCountryDropdown(false);
                                      setSearchCountry('');
                                    }}
                                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-slate-700 transition ${
                                      formData.country === country.code ? 'bg-indigo-500/20' : ''
                                    }`}
                                  >
                                    <img src={country.flag} alt="" className="w-6 h-4 object-cover rounded" />
                                    <span className="text-white text-sm flex-1">{country.name}</span>
                                    <span className="text-slate-400 text-xs">{country.dialCode}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {touched.country && formErrors.country && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.country}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Business Information */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <FaBuilding className="w-4 h-4 text-purple-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Business Information</h2>
                    <span className="text-xs text-red-400 ml-auto">All fields required</span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Company Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Company Name <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaBuilding className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.company && formErrors.company ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          onBlur={() => handleBlur('company')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.company && formErrors.company 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-purple-500/50 focus:border-purple-500'
                          }`}
                          placeholder="BuilderMonkey Technologies"
                        />
                      </div>
                      {touched.company && formErrors.company && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.company}
                        </p>
                      )}
                    </div>

                    {/* Tax ID */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        GST / Tax ID <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaIdCard className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.tax_id && formErrors.tax_id ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="text"
                          name="tax_id"
                          value={formData.tax_id}
                          onChange={handleChange}
                          onBlur={() => handleBlur('tax_id')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.tax_id && formErrors.tax_id 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-purple-500/50 focus:border-purple-500'
                          }`}
                          placeholder="22AAAAA0000A1Z5"
                        />
                      </div>
                      {touched.tax_id && formErrors.tax_id && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.tax_id}
                        </p>
                      )}
                    </div>

                    {/* State */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        State <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaMapMarkerAlt className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.state && formErrors.state ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          onBlur={() => handleBlur('state')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.state && formErrors.state 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-purple-500/50 focus:border-purple-500'
                          }`}
                          placeholder="Maharashtra"
                        />
                      </div>
                      {touched.state && formErrors.state && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.state}
                        </p>
                      )}
                    </div>

                    {/* City and Postal Code Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          City <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                          <FaCity className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                            touched.city && formErrors.city ? 'text-red-400' : 'text-slate-500'
                          }`} />
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            onBlur={() => handleBlur('city')}
                            className={`w-full bg-slate-900 border rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                              touched.city && formErrors.city 
                                ? 'border-red-500 focus:ring-red-500/50' 
                                : 'border-slate-700 focus:ring-purple-500/50 focus:border-purple-500'
                            }`}
                            placeholder="Mumbai"
                          />
                        </div>
                        {touched.city && formErrors.city && (
                          <p className="text-xs text-red-400 mt-1">{formErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">
                          Postal Code <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleChange}
                          onBlur={() => handleBlur('postal_code')}
                          className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.postal_code && formErrors.postal_code 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-purple-500/50 focus:border-purple-500'
                          }`}
                          placeholder="400001"
                        />
                        {touched.postal_code && formErrors.postal_code && (
                          <p className="text-xs text-red-400 mt-1">{formErrors.postal_code}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Security */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <FaShieldAlt className="w-4 h-4 text-green-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-white">Security</h2>
                    <span className="text-xs text-red-400 ml-auto">All fields required</span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaLock className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.password && formErrors.password ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          onBlur={() => handleBlur('password')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.password && formErrors.password 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-green-500/50 focus:border-green-500'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                        </button>
                      </div>
                      {formData.password && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getPasswordStrengthColor()} transition-all duration-300`}
                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                              />
                            </div>
                            <span className={`text-xs ${
                              passwordStrength <= 2 ? 'text-red-400' :
                              passwordStrength <= 3 ? 'text-yellow-400' :
                              passwordStrength <= 4 ? 'text-blue-400' :
                              'text-green-400'
                            }`}>
                              {getPasswordStrengthText()}
                            </span>
                          </div>
                        </div>
                      )}
                      {touched.password && formErrors.password && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">
                        Confirm Password <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <FaLock className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                          touched.confirmPassword && formErrors.confirmPassword ? 'text-red-400' : 'text-slate-500'
                        }`} />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          onBlur={() => handleBlur('confirmPassword')}
                          className={`w-full bg-slate-900 border rounded-xl pl-10 pr-12 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            touched.confirmPassword && formErrors.confirmPassword 
                              ? 'border-red-500 focus:ring-red-500/50' 
                              : 'border-slate-700 focus:ring-green-500/50 focus:border-green-500'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                        >
                          {showConfirmPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                        </button>
                      </div>
                      {touched.confirmPassword && formErrors.confirmPassword && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {formErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <FaExclamationCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                  <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              )}

              {success && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <FaCheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 mt-6">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-6 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium transition flex items-center gap-2"
                  >
                    <FaArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium transition flex items-center justify-center gap-2"
                  >
                    Continue
                    <FaChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <FaSpinner className="w-4 h-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="w-4 h-4" />
                        Complete Registration
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            {/* Login Link */}
            <div className="mt-5 pt-4 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
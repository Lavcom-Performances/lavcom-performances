# Add Laundromat Dialog - Flow Documentation

This document describes the user flow and logic of the **AddLaundromatDialog** component used to create new laundromat sites.

## Overview

The dialog allows users to add a new laundromat with automatic data filling capabilities (SIRET lookup for French businesses) and fallback manual input modes.

## Flow Diagram

```mermaid
flowchart TD
    A[User opens Add Laundromat Dialog] --> B{Select Country}
    
    B -->|France| C[Show SIRET Field]
    B -->|Other Country| D[Skip SIRET - Manual Input Only]
    
    C --> E{Enter SIRET Number}
    E -->|Valid 14 digits| F[Call fetch-from-siret API]
    F -->|Success| G[Auto-fill Company Name & Address]
    F -->|Error| H[Show Error - Manual Input Required]
    
    G --> I[City Search]
    H --> I
    D --> I
    
    I --> J{Search City}
    J -->|France| K[Call geo.api.gouv.fr API]
    J -->|Other Country| L[Call Nominatim API]
    
    K -->|Success| M[Show City Suggestions]
    K -->|Error + Retry Failed| N[Enable Fallback Mode]
    L -->|Success| M
    L -->|Error + Retry Failed| N
    
    M --> O[User Selects City]
    N --> P[Manual City Input]
    
    O --> Q[Auto-fill Postal Code & Department]
    P --> R[Manual Postal Code Entry]
    
    Q --> S[Address Search Optional]
    R --> S
    
    S --> T{Search Address}
    T -->|France| U[Call adresse.data.gouv.fr API]
    T -->|Other Country| V[Call Nominatim API]
    T -->|Skip| W[No Address]
    
    U --> X[Show Address Suggestions]
    V --> X
    X --> Y[User Selects Address]
    
    Y --> Z[NAF Code Selection Optional]
    W --> Z
    
    Z --> AA{Validate Form}
    AA -->|Valid| AB[Call validate-postal-code Edge Function]
    AA -->|Invalid| AC[Show Validation Errors]
    
    AB -->|Success| AD[Submit to Parent Component]
    AB -->|Warning| AE[Show Warning - Allow Submit]
    AE --> AD
    
    AD --> AF[Create Site in Database]
    AF --> AG[Close Dialog - Success]
```

## Component Architecture

```mermaid
flowchart LR
    subgraph Dialog["AddLaundromatDialog"]
        Form[Form State Management]
        Validation[Client-side Validation]
    end
    
    subgraph Autocomplete["Autocomplete Components"]
        City[CityAutocomplete]
        Address[AddressAutocomplete]
    end
    
    subgraph Hooks["Custom Hooks"]
        CitySearch[useCitySearch]
        AddressSearch[useAddressSearch]
    end
    
    subgraph APIs["External APIs"]
        SIRET[fetch-from-siret Edge Function]
        GeoFR[geo.api.gouv.fr]
        AddrFR[adresse.data.gouv.fr]
        Nominatim[OpenStreetMap Nominatim]
        PostalValidate[validate-postal-code Edge Function]
    end
    
    Form --> City
    Form --> Address
    City --> CitySearch
    Address --> AddressSearch
    
    CitySearch --> GeoFR
    CitySearch --> Nominatim
    AddressSearch --> AddrFR
    AddressSearch --> Nominatim
    
    Form --> SIRET
    Validation --> PostalValidate
```

## Key Features

### 1. SIRET Auto-fill (France Only)
- User enters a 14-digit SIRET number
- System calls the `fetch-from-siret` edge function
- On success: Company name and address are auto-filled
- On failure: User must enter data manually

### 2. City Search with Fallback
- Primary: Uses government APIs (geo.api.gouv.fr for France)
- Retry mechanism: Automatic retry on first failure
- Fallback: Manual input mode with "Retry" button if API unavailable

### 3. Address Autocomplete
- Optional field
- Uses adresse.data.gouv.fr for France
- Uses Nominatim for other countries

### 4. Postal Code Validation
- Client-side validation for format
- Server-side validation via edge function for France
- Auto-derives department code from postal code

### 5. Country Support
- France (full features: SIRET, specialized APIs)
- Belgium, Netherlands, Germany, Spain, Italy (Nominatim-based search)

## Form Fields

| Field | Required | Auto-fill Source |
|-------|----------|------------------|
| SIRET | No (FR only) | User input |
| Laundromat Name | Yes | SIRET API |
| Country | Yes | User selection |
| City | Yes | City search API |
| Postal Code | Yes | City selection |
| Department | No (FR only) | Derived from postal code |
| Address | No | Address search API or SIRET |
| NAF Code | No (FR only) | User selection |

## Error Handling

1. **API Failures**: Graceful degradation to manual input
2. **Network Issues**: Retry mechanism with user feedback
3. **Validation Errors**: Inline error messages per field
4. **Server Validation**: Warning dialogs for postal code mismatches

## Related Files

- `src/components/laundromat/AddLaundromatDialog.tsx` - Main dialog component
- `src/components/laundromat/CityAutocomplete.tsx` - City search component
- `src/components/laundromat/AddressAutocomplete.tsx` - Address search component
- `src/hooks/useCitySearch.ts` - City search hook
- `src/hooks/useAddressSearch.ts` - Address search hook
- `supabase/functions/fetch-from-siret/index.ts` - SIRET lookup edge function
- `supabase/functions/validate-postal-code/index.ts` - Postal code validation

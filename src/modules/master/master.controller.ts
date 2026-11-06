import { Request, Response } from "express";
import { Country, State, City } from "country-state-city";

export const getCountries = (req: Request, res: Response) => {
    const countries = Country.getAllCountries().map(c => ({
        id: c.isoCode,
        name: c.name
    }));
    res.json({ success: true, data: countries });
};

export const getStates = (req: Request, res: Response) => {
    const { countryId } = req.params;
    const states = State.getStatesOfCountry(countryId as string).map(s => ({
        id: s.isoCode,
        name: s.name
    }));
    res.json({ success: true, data: states });
};

export const getCities = (req: Request, res: Response) => {
    const { stateId } = req.params;
    // Note: country-state-city's getCitiesOfState requires both countryCode and stateCode
    // We might need to pass countryId as well or find it.
    // However, the stateId we use is the isoCode.
    
    // To be safe, let's allow passing countryId as a query param or part of the stateId if needed.
    // For now, let's look at how the library works.
    
    // Actually, stateId alone is not unique globally, but unique within a country.
    // Our frontend currently passes stateId (isoCode) from the states list of a country.
    
    // Let's check if we can get cities by just state code... no, library requires country code.
    const countryId = req.query.countryId as string;
    
    if (!countryId) {
        return res.status(400).json({ success: false, message: "countryId is required to fetch cities" });
    }

    const cities = City.getCitiesOfState(countryId as string, stateId as string).map(c => ({
        id: c.name, // Cities don't have unique IDs in this lib, name is usually used
        name: c.name
    }));
    res.json({ success: true, data: cities });
};

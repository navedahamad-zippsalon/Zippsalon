import * as leadRepository from "./lead.repository";

export const createLead = async (data: any) => {
    return leadRepository.createLead(data);
};

export const getAllLeads = async (options: {
    page: number;
    limit: number;
    search: string;
    sortBy: string;
    sortOrder: string;
}) => {
    return leadRepository.getAllLeads(options);
};

export const updateLeadStatus = async (id: string, status: any) => {
    return leadRepository.updateLeadStatus(id, status);
};

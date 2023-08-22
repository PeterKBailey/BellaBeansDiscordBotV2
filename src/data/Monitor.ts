import { ObjectId } from 'mongodb';
import { TextBasedChannel } from "discord.js";

export type MonitorOptions = {
    url: string;
    httpMethod: string;
    body: string | null;
    contentType: string | null;
    selector: string;
    frequency: string;
    operator: string;
    text: string;
    channelId: string;
    autoCancel: boolean;
};

export type MonitorDocument = {
    _id: ObjectId;
    cronSchedule: string;
    options: MonitorOptions;
}
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface MysqlProps extends StackProps {
    /**
     * VPC Id
     * @type {string}
     * @memberof MysqlProps
     */
    readonly vpcId?: string;
    /**
     * List of Subnet
     * @type {string[]}
     * @memberof MysqlProps
     */
    readonly subnetIds?: string[];
    /**
     * provide the name of the database
     * @type {string}
     * @memberof MysqlProps
     */
    readonly dbName?: string;
    /**
     *
     * ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
     * @type {*}
     * @memberof MysqlProps
     * @default ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.LARGE)
     */
    readonly instanceType?: any;
    /**
     * provide the version of the database
     * @type {*}
     * @memberof MysqlProps
     * @default rds.MysqlEngineVersion.VER_8_0_28
     */
    readonly engineVersion?: any;
    /**
     * user name of the database
     * @type {str}
     * @memberof MysqlProps
     * @default dbadmin
     */
    readonly mysqlUsername?: string;
    /**
     * backup retention days for example 14
     * @type {number}
     * @memberof MysqlProps
     * @default 14
     */
    readonly backupRetentionDays?: number;
    /**
     * backup window time 00:15-01:15
     * @type {string}
     * @memberof MysqlProps
     * @default 00:15-01:15
     */
    readonly backupWindow?: string;
    /**
     *
     * maintenance time Sun:23:45-Mon:00:15
     * @type {string}
     * @memberof MysqlProps
     * @default Sun:23:45-Mon:00:15
     */
    readonly preferredMaintenanceWindow?: string;
    /**
     *
     * list of ingress sources
     * @type {any []}
     * @memberof MysqlProps
     */
    readonly ingressSources?: any[];
}
export declare class Mysql extends Stack {
    constructor(scope: Construct, id: string, props: MysqlProps);
}

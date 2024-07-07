"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Mysql = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const rds = __importStar(require("aws-cdk-lib/aws-rds"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
class Mysql extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        // default database username
        var mysqlUsername = "dbadmin";
        if (typeof props.mysqlUsername !== 'undefined') {
            mysqlUsername = props.mysqlUsername;
        }
        var ingressSources = [];
        if (typeof props.ingressSources !== 'undefined') {
            ingressSources = props.ingressSources;
        }
        var engineVersion = rds.MysqlEngineVersion.VER_8_0_28;
        if (typeof props.engineVersion !== 'undefined') {
            engineVersion = props.engineVersion;
        }
        const azs = aws_cdk_lib_1.Fn.getAzs();
        // vpc
        const vpc = ec2.Vpc.fromVpcAttributes(this, 'ExistingVPC', {
            vpcId: props.vpcId,
            availabilityZones: azs,
        });
        // Subnets
        const subnets = [];
        for (let subnetId of props.subnetIds) {
            const subid = subnetId
                .replace('_', '')
                .replace(' ', '');
            subnets.push(ec2.Subnet.fromSubnetAttributes(this, subid, {
                subnetId: subid,
            }));
        }
        const vpcSubnets = {
            subnets: subnets,
        };
        const allAll = ec2.Port.allTraffic();
        const tcp3306 = ec2.Port.tcpRange(3306, 3306);
        const dbsg = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
            vpc: vpc,
            allowAllOutbound: true,
            description: id + 'Database',
            securityGroupName: id + 'Database',
        });
        dbsg.addIngressRule(dbsg, allAll, 'all from self');
        dbsg.addEgressRule(ec2.Peer.ipv4('0.0.0.0/0'), allAll, 'all out');
        const mysqlConnectionPorts = [
            { port: tcp3306, description: 'tcp3306 Mysql' },
        ];
        for (let ingressSource of ingressSources) {
            for (let c of mysqlConnectionPorts) {
                dbsg.addIngressRule(ingressSource, c.port, c.description);
            }
        }
        const dbSubnetGroup = new rds.SubnetGroup(this, 'DatabaseSubnetGroup', {
            vpc: vpc,
            description: id + 'subnet group',
            vpcSubnets: vpcSubnets,
            subnetGroupName: id + 'subnet group',
        });
        const mysqlSecret = new secretsmanager.Secret(this, 'MysqlCredentials', {
            secretName: props.dbName + 'MysqlCredentials',
            description: props.dbName + 'Mysql Database Crendetials',
            generateSecretString: {
                excludeCharacters: "\"@/\\ '",
                generateStringKey: 'password',
                passwordLength: 30,
                secretStringTemplate: JSON.stringify({ username: mysqlUsername }),
            },
        });
        const mysqlCredentials = rds.Credentials.fromSecret(mysqlSecret, mysqlUsername);
        const dbParameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
            engine: rds.DatabaseInstanceEngine.mysql({
                version: engineVersion,
            }),
        });
        const mysqlInstance = new rds.DatabaseInstance(this, 'MysqlDatabase', {
            databaseName: props.dbName,
            instanceIdentifier: props.dbName,
            credentials: mysqlCredentials,
            engine: rds.DatabaseInstanceEngine.mysql({
                version: engineVersion,
            }),
            backupRetention: aws_cdk_lib_1.Duration.days(7),
            allocatedStorage: 20,
            securityGroups: [dbsg],
            allowMajorVersionUpgrade: true,
            autoMinorVersionUpgrade: true,
            instanceType: props.instanceType,
            vpcSubnets: vpcSubnets,
            vpc: vpc,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            storageEncrypted: true,
            monitoringInterval: aws_cdk_lib_1.Duration.seconds(60),
            enablePerformanceInsights: true,
            parameterGroup: dbParameterGroup,
            subnetGroup: dbSubnetGroup,
            preferredBackupWindow: props.backupWindow,
            preferredMaintenanceWindow: props.preferredMaintenanceWindow,
            publiclyAccessible: false,
        });
        mysqlInstance.addRotationSingleUser();
        // Tags
        aws_cdk_lib_1.Tags.of(mysqlInstance).add('Name', 'MysqlDatabase', {
            priority: 300,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'MysqlEndpoint', {
            exportName: 'MysqlEndPoint',
            value: mysqlInstance.dbInstanceEndpointAddress,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'MysqlUserName', {
            exportName: 'MysqlUserName',
            value: mysqlUsername,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'MysqlDbName', {
            exportName: 'MysqlDbName',
            value: props.dbName,
        });
    }
}
exports.Mysql = Mysql;
const app = new aws_cdk_lib_1.App({ outdir: 'dist' });
new Mysql(app, 'MysqlStack', {
    env: { region: "us-east-2" }, description: "Mysql Stack",
    vpcId: "vpc-aaaaaaaa",
    subnetIds: ["subnet-xxxxxxxx", "subnet-yyyyyyyy", "subnet-zzzzzzzz"],
    dbName: "sampledb"
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXlzcWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJteXNxbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDZDQVN1QjtBQUNyQix5REFBMkM7QUFFM0MseURBQTJDO0FBQzNDLCtFQUFpRTtBQXVGakUsTUFBYSxLQUFNLFNBQVEsbUJBQUs7SUFDOUIsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQjtRQUN6RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLDRCQUE0QjtRQUM1QixJQUFJLGFBQWEsR0FBRyxTQUFTLENBQUM7UUFDOUIsSUFBSSxPQUFPLEtBQUssQ0FBQyxhQUFhLEtBQUssV0FBVyxFQUFFO1lBQzlDLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3JDO1FBQ0QsSUFBSSxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksT0FBTyxLQUFLLENBQUMsY0FBYyxLQUFLLFdBQVcsRUFBRTtZQUMvQyxjQUFjLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQztTQUN2QztRQUNELElBQUksYUFBYSxHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUM7UUFDdEQsSUFBSSxPQUFPLEtBQUssQ0FBQyxhQUFhLEtBQUssV0FBVyxFQUFFO1lBQzlDLGFBQWEsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3JDO1FBSUQsTUFBTSxHQUFHLEdBQUcsZ0JBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUV4QixNQUFNO1FBQ04sTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3pELEtBQUssRUFBRSxLQUFLLENBQUMsS0FBTTtZQUNuQixpQkFBaUIsRUFBRSxHQUFHO1NBQ3ZCLENBQUMsQ0FBQztRQUVILFVBQVU7UUFDVixNQUFNLE9BQU8sR0FBVSxFQUFF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LENBQUM7UUFHSCxJQUFJLHVCQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNuQyxVQUFVLEVBQUUsZUFBZTtZQUMzQixLQUFLLEVBQUUsYUFBYSxDQUFDLHlCQUF5QjtTQUMvQyxDQUFDLENBQUM7UUFFSCxJQUFJLHVCQUFTLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNuQyxVQUFVLEVBQUUsZUFBZTtZQUMzQixLQUFLLEVBQUUsYUFBYTtTQUNyQixDQUFDLENBQUM7UUFFSCxJQUFJLHVCQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNqQyxVQUFVLEVBQUUsYUFBYTtZQUN6QixLQUFLLEVBQUUsS0FBSyxDQUFDLE1BQU87U0FDckIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBckpELHNCQXFKQztBQUdELE1BQU0sR0FBRyxHQUFHLElBQUksaUJBQUcsQ0FBQyxFQUFDLE1BQU0sRUFBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO0FBRXJDLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUU7SUFDM0IsR0FBRyxFQUFDLEVBQUMsTUFBTSxFQUFDLFdBQVcsRUFBQyxFQUFFLFdBQVcsRUFBQyxhQUFhO0lBQ25ELEtBQUssRUFBQyxjQUFjO0lBQ3BCLFNBQVMsRUFBQyxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDO0lBQ25FLE1BQU0sRUFBQyxVQUFVO0NBQ2xCLENBQUMsQ0FBQztBQUNILEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcbiAgICBDZm5PdXRwdXQsXHJcbiAgICBTdGFjayxcclxuICAgIFN0YWNrUHJvcHMsXHJcbiAgICBUYWdzLFxyXG4gICAgQXBwLFxyXG4gICAgRm4sXHJcbiAgICBEdXJhdGlvbixcclxuICAgIFJlbW92YWxQb2xpY3ksXHJcbiAgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcbiAgaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xyXG4gIGltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG4gIGltcG9ydCAqIGFzIHJkcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtcmRzJztcclxuICBpbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG4gIGltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG4gIFxyXG4gIGV4cG9ydCBpbnRlcmZhY2UgTXlzcWxQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xyXG4gIFxyXG4gICAgLyoqXHJcbiAgICAgKiBWUEMgSWRcclxuICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgKiBAbWVtYmVyb2YgTXlzcWxQcm9wc1xyXG4gICAgICovXHJcbiAgICByZWFkb25seSB2cGNJZD86IHN0cmluZztcclxuICBcclxuICAgIC8qKlxyXG4gICAgICogTGlzdCBvZiBTdWJuZXRcclxuICAgICAqIEB0eXBlIHtzdHJpbmdbXX1cclxuICAgICAqIEBtZW1iZXJvZiBNeXNxbFByb3BzXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IHN1Ym5ldElkcz86IHN0cmluZ1tdO1xyXG4gIFxyXG4gIFxyXG4gICAgLyoqXHJcbiAgICAgKiBwcm92aWRlIHRoZSBuYW1lIG9mIHRoZSBkYXRhYmFzZVxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqIEBtZW1iZXJvZiBNeXNxbFByb3BzXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGRiTmFtZT86IHN0cmluZztcclxuICBcclxuICAgIC8qKlxyXG4gICAgICpcclxuICAgICAqIGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuQlVSU1RBQkxFMywgZWMyLkluc3RhbmNlU2l6ZS5MQVJHRSlcclxuICAgICAqIEB0eXBlIHsqfVxyXG4gICAgICogQG1lbWJlcm9mIE15c3FsUHJvcHNcclxuICAgICAqIEBkZWZhdWx0IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuQlVSU1RBQkxFMywgZWMyLkluc3RhbmNlU2l6ZS5MQVJHRSlcclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgaW5zdGFuY2VUeXBlPzogYW55O1xyXG4gIFxyXG4gICAgLyoqXHJcbiAgICAgKiBwcm92aWRlIHRoZSB2ZXJzaW9uIG9mIHRoZSBkYXRhYmFzZVxyXG4gICAgICogQHR5cGUgeyp9XHJcbiAgICAgKiBAbWVtYmVyb2YgTXlzcWxQcm9wc1xyXG4gICAgICogQGRlZmF1bHQgcmRzLk15c3FsRW5naW5lVmVyc2lvbi5WRVJfOF8wXzI4XHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGVuZ2luZVZlcnNpb24/OiBhbnk7XHJcbiAgXHJcbiAgICAvKipcclxuICAgICAqIHVzZXIgbmFtZSBvZiB0aGUgZGF0YWJhc2VcclxuICAgICAqIEB0eXBlIHtzdHJ9XHJcbiAgICAgKiBAbWVtYmVyb2YgTXlzcWxQcm9wc1xyXG4gICAgICogQGRlZmF1bHQgZGJhZG1pblxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBteXNxbFVzZXJuYW1lPzogc3RyaW5nO1xyXG4gIFxyXG4gICAgLyoqXHJcbiAgICAgKiBiYWNrdXAgcmV0ZW50aW9uIGRheXMgZm9yIGV4YW1wbGUgMTRcclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKiBAbWVtYmVyb2YgTXlzcWxQcm9wc1xyXG4gICAgICogQGRlZmF1bHQgMTRcclxuICAgICAqL1xyXG4gICAgcmVhZG9ubHkgYmFja3VwUmV0ZW50aW9uRGF5cz86IG51bWJlcjtcclxuICBcclxuICAgIC8qKlxyXG4gICAgICogYmFja3VwIHdpbmRvdyB0aW1lIDAwOjE1LTAxOjE1XHJcbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxyXG4gICAgICogQG1lbWJlcm9mIE15c3FsUHJvcHNcclxuICAgICAqIEBkZWZhdWx0IDAwOjE1LTAxOjE1XHJcbiAgICAgKi9cclxuICBcclxuICAgIHJlYWRvbmx5IGJhY2t1cFdpbmRvdz86IHN0cmluZztcclxuICBcclxuICAgIC8qKlxyXG4gICAgICpcclxuICAgICAqIG1haW50ZW5hbmNlIHRpbWUgU3VuOjIzOjQ1LU1vbjowMDoxNVxyXG4gICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAqIEBtZW1iZXJvZiBNeXNxbFByb3BzXHJcbiAgICAgKiBAZGVmYXVsdCBTdW46MjM6NDUtTW9uOjAwOjE1XHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IHByZWZlcnJlZE1haW50ZW5hbmNlV2luZG93Pzogc3RyaW5nO1xyXG4gIFxyXG4gICAgLyoqXHJcbiAgICAgKlxyXG4gICAgICogbGlzdCBvZiBpbmdyZXNzIHNvdXJjZXNcclxuICAgICAqIEB0eXBlIHthbnkgW119XHJcbiAgICAgKiBAbWVtYmVyb2YgTXlzcWxQcm9wc1xyXG4gICAgICovXHJcbiAgICByZWFkb25seSBpbmdyZXNzU291cmNlcz86IGFueVtdO1xyXG4gIH1cclxuICBcclxuICBleHBvcnQgY2xhc3MgTXlzcWwgZXh0ZW5kcyBTdGFjayB7XHJcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTXlzcWxQcm9wcykge1xyXG4gICAgICBzdXBlcihzY29wZSwgaWQpO1xyXG4gIFxyXG4gICAgICAvLyBkZWZhdWx0IGRhdGFiYXNlIHVzZXJuYW1lXHJcbiAgICAgIHZhciBteXNxbFVzZXJuYW1lID0gXCJkYmFkbWluXCI7XHJcbiAgICAgIGlmICh0eXBlb2YgcHJvcHMubXlzcWxVc2VybmFtZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICBteXNxbFVzZXJuYW1lID0gcHJvcHMubXlzcWxVc2VybmFtZTtcclxuICAgICAgfVxyXG4gICAgICB2YXIgaW5ncmVzc1NvdXJjZXMgPSBbXTtcclxuICAgICAgaWYgKHR5cGVvZiBwcm9wcy5pbmdyZXNzU291cmNlcyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICBpbmdyZXNzU291cmNlcyA9IHByb3BzLmluZ3Jlc3NTb3VyY2VzO1xyXG4gICAgICB9XHJcbiAgICAgIHZhciBlbmdpbmVWZXJzaW9uID0gcmRzLk15c3FsRW5naW5lVmVyc2lvbi5WRVJfOF8wXzI4O1xyXG4gICAgICBpZiAodHlwZW9mIHByb3BzLmVuZ2luZVZlcnNpb24gIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgZW5naW5lVmVyc2lvbiA9IHByb3BzLmVuZ2luZVZlcnNpb247XHJcbiAgICAgIH1cclxuICBcclxuICBcclxuICBcclxuICAgICAgY29uc3QgYXpzID0gRm4uZ2V0QXpzKCk7XHJcbiAgXHJcbiAgICAgIC8vIHZwY1xyXG4gICAgICBjb25zdCB2cGMgPSBlYzIuVnBjLmZyb21WcGNBdHRyaWJ1dGVzKHRoaXMsICdFeGlzdGluZ1ZQQycsIHtcclxuICAgICAgICB2cGNJZDogcHJvcHMudnBjSWQhLFxyXG4gICAgICAgIGF2YWlsYWJpbGl0eVpvbmVzOiBhenMsXHJcbiAgICAgIH0pO1xyXG4gIFxyXG4gICAgICAvLyBTdWJuZXRzXHJcbiAgICAgIGNvbnN0IHN1Ym5ldHM6IGFueVtdID0gW107XHJcbiAgXHJcbiAgICAgIGZvciAobGV0IHN1Ym5ldElkIG9mIHByb3BzLnN1Ym5ldElkcyEpIHtcclxuICAgICAgICBjb25zdCBzdWJpZCA9IHN1Ym5ldElkXHJcbiAgICAgICAgICAucmVwbGFjZSgnXycsICcnKVxyXG4gICAgICAgICAgLnJlcGxhY2UoJyAnLCAnJyk7XHJcbiAgICAgICAgc3VibmV0cy5wdXNoKFxyXG4gICAgICAgICAgZWMyLlN1Ym5ldC5mcm9tU3VibmV0QXR0cmlidXRlcyh0aGlzLCBzdWJpZCwge1xyXG4gICAgICAgICAgICBzdWJuZXRJZDogc3ViaWQsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgXHJcbiAgICAgIGNvbnN0IHZwY1N1Ym5ldHM6IGVjMi5TdWJuZXRTZWxlY3Rpb24gPSB7XHJcbiAgICAgICAgc3VibmV0czogc3VibmV0cyxcclxuICAgICAgfTtcclxuICBcclxuICAgICAgY29uc3QgYWxsQWxsID0gZWMyLlBvcnQuYWxsVHJhZmZpYygpO1xyXG4gICAgICBjb25zdCB0Y3AzMzA2ID0gZWMyLlBvcnQudGNwUmFuZ2UoMzMwNiwgMzMwNik7XHJcbiAgXHJcbiAgICAgIGNvbnN0IGRic2cgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0RhdGFiYXNlU2VjdXJpdHlHcm91cCcsIHtcclxuICAgICAgICB2cGM6IHZwYyxcclxuICAgICAgICBhbGxvd0FsbE91dGJvdW5kOiB0cnVlLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBpZCArICdEYXRhYmFzZScsXHJcbiAgICAgICAgc2VjdXJpdHlHcm91cE5hbWU6IGlkICsgJ0RhdGFiYXNlJyxcclxuICAgICAgfSk7XHJcbiAgXHJcbiAgICAgIGRic2cuYWRkSW5ncmVzc1J1bGUoZGJzZywgYWxsQWxsLCAnYWxsIGZyb20gc2VsZicpO1xyXG4gICAgICBkYnNnLmFkZEVncmVzc1J1bGUoZWMyLlBlZXIuaXB2NCgnMC4wLjAuMC8wJyksIGFsbEFsbCwgJ2FsbCBvdXQnKTtcclxuICBcclxuICAgICAgY29uc3QgbXlzcWxDb25uZWN0aW9uUG9ydHMgPSBbXHJcbiAgICAgICAgeyBwb3J0OiB0Y3AzMzA2LCBkZXNjcmlwdGlvbjogJ3RjcDMzMDYgTXlzcWwnIH0sXHJcbiAgICAgIF07XHJcbiAgXHJcbiAgICAgIGZvciAobGV0IGluZ3Jlc3NTb3VyY2Ugb2YgaW5ncmVzc1NvdXJjZXMhKSB7XHJcbiAgICAgICAgZm9yIChsZXQgYyBvZiBteXNxbENvbm5lY3Rpb25Qb3J0cykge1xyXG4gICAgICAgICAgZGJzZy5hZGRJbmdyZXNzUnVsZShpbmdyZXNzU291cmNlLCBjLnBvcnQsIGMuZGVzY3JpcHRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gIFxyXG4gICAgICBjb25zdCBkYlN1Ym5ldEdyb3VwID0gbmV3IHJkcy5TdWJuZXRHcm91cCh0aGlzLCAnRGF0YWJhc2VTdWJuZXRHcm91cCcsIHtcclxuICAgICAgICB2cGM6IHZwYyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogaWQgKyAnc3VibmV0IGdyb3VwJyxcclxuICAgICAgICB2cGNTdWJuZXRzOiB2cGNTdWJuZXRzLFxyXG4gICAgICAgIHN1Ym5ldEdyb3VwTmFtZTogaWQgKyAnc3VibmV0IGdyb3VwJyxcclxuICAgICAgfSk7XHJcbiAgXHJcbiAgICAgIGNvbnN0IG15c3FsU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnTXlzcWxDcmVkZW50aWFscycsIHtcclxuICAgICAgICBzZWNyZXROYW1lOiBwcm9wcy5kYk5hbWUgKyAnTXlzcWxDcmVkZW50aWFscycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246IHByb3BzLmRiTmFtZSArICdNeXNxbCBEYXRhYmFzZSBDcmVuZGV0aWFscycsXHJcbiAgICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICAgIGV4Y2x1ZGVDaGFyYWN0ZXJzOiBcIlxcXCJAL1xcXFwgJ1wiLFxyXG4gICAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwYXNzd29yZCcsXHJcbiAgICAgICAgICBwYXNzd29yZExlbmd0aDogMzAsXHJcbiAgICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoe3VzZXJuYW1lOiBteXNxbFVzZXJuYW1lfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcbiAgXHJcbiAgICAgIGNvbnN0IG15c3FsQ3JlZGVudGlhbHMgPSByZHMuQ3JlZGVudGlhbHMuZnJvbVNlY3JldChcclxuICAgICAgICBteXNxbFNlY3JldCxcclxuICAgICAgICBteXNxbFVzZXJuYW1lLFxyXG4gICAgICApO1xyXG4gIFxyXG4gICAgICBjb25zdCBkYlBhcmFtZXRlckdyb3VwID0gbmV3IHJkcy5QYXJhbWV0ZXJHcm91cCh0aGlzLCAnUGFyYW1ldGVyR3JvdXAnLCB7XHJcbiAgICAgICAgZW5naW5lOiByZHMuRGF0YWJhc2VJbnN0YW5jZUVuZ2luZS5teXNxbCh7XHJcbiAgICAgICAgICB2ZXJzaW9uOiBlbmdpbmVWZXJzaW9uLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KTtcclxuICBcclxuICBcclxuICBcclxuICAgICAgY29uc3QgbXlzcWxJbnN0YW5jZSA9IG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnTXlzcWxEYXRhYmFzZScsIHtcclxuICAgICAgICBkYXRhYmFzZU5hbWU6IHByb3BzLmRiTmFtZSxcclxuICAgICAgICBpbnN0YW5jZUlkZW50aWZpZXI6IHByb3BzLmRiTmFtZSxcclxuICAgICAgICBjcmVkZW50aWFsczogbXlzcWxDcmVkZW50aWFscyxcclxuICAgICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUluc3RhbmNlRW5naW5lLm15c3FsKHtcclxuICAgICAgICAgIHZlcnNpb246IGVuZ2luZVZlcnNpb24sXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgYmFja3VwUmV0ZW50aW9uOiBEdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IDIwLFxyXG4gICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbZGJzZ10sXHJcbiAgICAgICAgYWxsb3dNYWpvclZlcnNpb25VcGdyYWRlOiB0cnVlLFxyXG4gICAgICAgIGF1dG9NaW5vclZlcnNpb25VcGdyYWRlOiB0cnVlLFxyXG4gICAgICAgIGluc3RhbmNlVHlwZTogcHJvcHMuaW5zdGFuY2VUeXBlLFxyXG4gICAgICAgIHZwY1N1Ym5ldHM6IHZwY1N1Ym5ldHMsXHJcbiAgICAgICAgdnBjOiB2cGMsXHJcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICAgIHN0b3JhZ2VFbmNyeXB0ZWQ6IHRydWUsXHJcbiAgICAgICAgbW9uaXRvcmluZ0ludGVydmFsOiBEdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgICBlbmFibGVQZXJmb3JtYW5jZUluc2lnaHRzOiB0cnVlLFxyXG4gICAgICAgIHBhcmFtZXRlckdyb3VwOiBkYlBhcmFtZXRlckdyb3VwLFxyXG4gICAgICAgIHN1Ym5ldEdyb3VwOiBkYlN1Ym5ldEdyb3VwLFxyXG4gICAgICAgIHByZWZlcnJlZEJhY2t1cFdpbmRvdzogcHJvcHMuYmFja3VwV2luZG93LFxyXG4gICAgICAgIHByZWZlcnJlZE1haW50ZW5hbmNlV2luZG93OiBwcm9wcy5wcmVmZXJyZWRNYWludGVuYW5jZVdpbmRvdyxcclxuICAgICAgICBwdWJsaWNseUFjY2Vzc2libGU6IGZhbHNlLFxyXG4gICAgICB9KTtcclxuICBcclxuICAgICAgbXlzcWxJbnN0YW5jZS5hZGRSb3RhdGlvblNpbmdsZVVzZXIoKTtcclxuICBcclxuICAgICAgLy8gVGFnc1xyXG4gICAgICBUYWdzLm9mKG15c3FsSW5zdGFuY2UpLmFkZCgnTmFtZScsICdNeXNxbERhdGFiYXNlJywge1xyXG4gICAgICAgIHByaW9yaXR5OiAzMDAsXHJcbiAgICAgIH0pO1xyXG4gIFxyXG4gIFxyXG4gICAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdNeXNxbEVuZHBvaW50Jywge1xyXG4gICAgICAgIGV4cG9ydE5hbWU6ICdNeXNxbEVuZFBvaW50JyxcclxuICAgICAgICB2YWx1ZTogbXlzcWxJbnN0YW5jZS5kYkluc3RhbmNlRW5kcG9pbnRBZGRyZXNzLFxyXG4gICAgICB9KTtcclxuICBcclxuICAgICAgbmV3IENmbk91dHB1dCh0aGlzLCAnTXlzcWxVc2VyTmFtZScsIHtcclxuICAgICAgICBleHBvcnROYW1lOiAnTXlzcWxVc2VyTmFtZScsXHJcbiAgICAgICAgdmFsdWU6IG15c3FsVXNlcm5hbWUsXHJcbiAgICAgIH0pO1xyXG4gIFxyXG4gICAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdNeXNxbERiTmFtZScsIHtcclxuICAgICAgICBleHBvcnROYW1lOiAnTXlzcWxEYk5hbWUnLFxyXG4gICAgICAgIHZhbHVlOiBwcm9wcy5kYk5hbWUhLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgXHJcbiAgY29uc3QgYXBwID0gbmV3IEFwcCh7b3V0ZGlyOidkaXN0J30pO1xyXG4gIFxyXG4gIG5ldyBNeXNxbChhcHAsICdNeXNxbFN0YWNrJywge1xyXG4gICAgZW52OntyZWdpb246XCJ1cy1lYXN0LTJcIn0sIGRlc2NyaXB0aW9uOlwiTXlzcWwgU3RhY2tcIixcclxuICAgIHZwY0lkOlwidnBjLWFhYWFhYWFhXCIsXHJcbiAgICBzdWJuZXRJZHM6W1wic3VibmV0LXh4eHh4eHh4XCIsIFwic3VibmV0LXl5eXl5eXl5XCIsIFwic3VibmV0LXp6enp6enp6XCJdLFxyXG4gICAgZGJOYW1lOlwic2FtcGxlZGJcIlxyXG4gIH0pO1xyXG4gIGFwcC5zeW50aCgpXHJcblxyXG4gICJdfQ==
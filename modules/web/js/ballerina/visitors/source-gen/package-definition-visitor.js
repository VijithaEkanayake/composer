/**
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import _ from 'lodash';
import AbstractSourceGenVisitor from './abstract-source-gen-visitor';

/**
 * @param parent
 * @constructor
 */
class PackageDefinitionVisitor extends AbstractSourceGenVisitor {

    canVisitPackageDefinition() {
        return true;
    }

    beginVisitPackageDefinition(packageDefinition) {
        /**
         * set the configuration start for the package definition language construct
         * If we need to add additional parameters which are dynamically added to the configuration start
         * that particular source generation has to be constructed here
         */
        if (!_.isNil(packageDefinition.getPackageName()) && packageDefinition.getPackageName() !== '') {
            const middleWS = packageDefinition.getParent().getWSRegion(1);
            const constructedSourceSegment = 'package'
                + ((packageDefinition.whiteSpace.useDefault) ? ' ' : middleWS)
                + packageDefinition.getPackageName();
            this.appendSource(constructedSourceSegment);
        }
    }

    visitPackageDefinition() {
    }

    endVisitPackageDefinition(packageDefinition) {
        if (!_.isNil(packageDefinition.getPackageName()) && packageDefinition.getPackageName() !== '') {
            let tailingWS = packageDefinition.getParent().getWSRegion(3);
            tailingWS = (packageDefinition.whiteSpace.useDefault) ? '\n\n' : tailingWS;
            this.appendSource(
                packageDefinition.getParent().getWSRegion(2) + ';' + tailingWS,
            );
            this.getParent().appendSource(this.getIndentation() + this.getGeneratedSource());
        }
    }
}

export default PackageDefinitionVisitor;

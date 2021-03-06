/*
*  Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
*
*  WSO2 Inc. licenses this file to you under the Apache License,
*  Version 2.0 (the "License"); you may not use this file except
*  in compliance with the License.
*  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing,
*  software distributed under the License is distributed on an
*  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
*  KIND, either express or implied.  See the License for the
*  specific language governing permissions and limitations
*  under the License.
*/

package org.ballerinalang.composer.service.workspace.langserver.util.resolvers;

import org.ballerinalang.composer.service.workspace.langserver.SymbolInfo;
import org.ballerinalang.composer.service.workspace.langserver.dto.CompletionItem;
import org.ballerinalang.composer.service.workspace.suggetions.SuggestionsFilterDataModel;
import org.ballerinalang.util.parser.BallerinaParser;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * ResolveCommandExecutor will accept the command to execute
 */
public class ResolveCommandExecutor {
    private static final HashMap<Class, ItemResolver> resolvers = new HashMap<>();

    public ResolveCommandExecutor() {
        StatementContextResolver statementContextResolver = new StatementContextResolver();
        VariableDefinitionStatementContextResolver variableDefinitionStatementContextResolver =
                new VariableDefinitionStatementContextResolver();
        PackageNameContextResolver packageNameContextResolver = new PackageNameContextResolver();
        AnnotationAttachmentContextResolver annotationAttachmentContextResolver =
                new AnnotationAttachmentContextResolver();
        DefaultResolver defaultResolver = new DefaultResolver();

        resolvers.put(BallerinaParser.StatementContext.class, statementContextResolver);
        resolvers.put(BallerinaParser.VariableDefinitionStatementContext.class,
                variableDefinitionStatementContextResolver);
        resolvers.put(BallerinaParser.PackageNameContext.class, packageNameContextResolver);
        // TODO
        // For the moment we are considering both import resolver and the package resolver to be same, this will
        // Differentiate accordingly in the future
        resolvers.put(BallerinaParser.ImportDeclarationContext.class, packageNameContextResolver);
        resolvers.put(BallerinaParser.AnnotationAttachmentContext.class, annotationAttachmentContextResolver);
        resolvers.put(null, defaultResolver);
    }

    /**
     * Resolve the completion items based on the criteria
     * @param resolveCriteria - resolving criteria
     * @param dataModel - SuggestionsFilterDataModel
     * @param symbols - Symbols list
     * @return {@link ArrayList}
     */
    public ArrayList<CompletionItem> resolveCompletionItems
    (Class resolveCriteria, SuggestionsFilterDataModel dataModel, ArrayList<SymbolInfo> symbols) {
        return resolvers.get(resolveCriteria).resolveItems(dataModel, symbols);
    }
}

/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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

import log from 'log';
import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { statement } from './../configs/designer-defaults';
import { lifeLine } from './../configs/designer-defaults';
import ASTNode from '../ast/node';
import ActionBox from './action-box';
import DragDropManager from '../tool-palette/drag-drop-manager';
import SimpleBBox from './../ast/simple-bounding-box';
import * as DesignerDefaults from './../configs/designer-defaults';
import MessageManager from './../visitors/message-manager';
import BallerinaASTFactory from './../ast/ballerina-ast-factory';
import './statement-decorator.css';
import select2 from 'select2';
import TransformRender from '../../ballerina/components/transform-render';
import ActiveArbiter from './active-arbiter';
import ImageUtil from './image-util';
import alerts from 'alerts';

const text_offset = 50;

class TransformStatementDecorator extends React.Component {

    constructor(props, context) {
        super(props, context);
        const { dragDropManager } = context;
        this.startDropZones = this.startDropZones.bind(this);
        this.stopDragZones = this.stopDragZones.bind(this);
        this.state = {
		    innerDropZoneActivated: false,
	        innerDropZoneDropNotAllowed: false,
	        innerDropZoneExist: false,
            active: 'hidden',
        };
    }

    componentDidMount() {
        const { dragDropManager } = this.context;
        dragDropManager.on('drag-start', this.startDropZones);
        dragDropManager.on('drag-stop', this.stopDragZones);
    }

    componentWillUnmount() {
        const { dragDropManager } = this.context;
        dragDropManager.off('drag-start', this.startDropZones);
        dragDropManager.off('drag-stop', this.stopDragZones);
    }

    startDropZones() {
        this.setState({ innerDropZoneExist: true });
    }

    stopDragZones() {
        this.setState({ innerDropZoneExist: false });
    }

    onDelete() {
        this.props.model.remove();
    }
    /**
     * Navigates to codeline in the source view from the design view node
     *
     */
    onJumptoCodeLine() {
        const { viewState: { fullExpression } } = this.props;
        const { renderingContext: { ballerinaFileEditor } } = this.context;

        const container = ballerinaFileEditor._container;
        $(container).find('.view-source-btn').trigger('click');
        ballerinaFileEditor.getSourceView().jumpToLine({ expression: fullExpression });
    }
    /**
     * Renders breakpoint indicator
     */
    renderBreakpointIndicator() {
        const breakpointSize = 14;
        const pointX = this.statementBox.x + this.statementBox.w - breakpointSize / 2;
        const pointY = this.statementBox.y - breakpointSize / 2;
        return (
          <Breakpoint
                  x={pointX}
                  y={pointY}
                  size={breakpointSize}
                  isBreakpoint={this.props.model.isBreakpoint}
                  onClick={() => this.onBreakpointClick()}
                />
        );
    }
    /**
     * Handles click event of breakpoint, adds/remove breakpoint from the node when click event fired
     *
     */
    onBreakpointClick() {
        const { model } = this.props;
        const { isBreakpoint = false } = model;
        if (model.isBreakpoint) {
            model.removeBreakpoint();
        } else {
            model.addBreakpoint();
        }
    }

    getTransformVarJson(args) {
        let argArray = [];
        _.forEach(args, argument => {
            if (BallerinaASTFactory.isVariableDefinitionStatement(argument)) {
                let arg = {
                    id : argument.getID(),
                    type : argument.children[0].getVariableType(),
                    name : argument.children[0].getVariableName()
                };
                argArray.push(arg);
            } else if (BallerinaASTFactory.isParameterDefinition(argument)) {
                let arg = {
                    id : argument.getID(),
                    type : argument.getTypeName(),
                    name : argument.getName()
                };
                argArray.push(arg);
            }
        });
        return argArray;
    }

    onExpand() {
        self = this;
        this._package = this.context.renderingContext.getPackagedScopedEnvironment().getCurrentPackage();
        let sourceId = 'sourceStructs' + this.props.model.id;
        let targetId = 'targetStructs' + this.props.model.id;

        let sourceContent = $(
                '<div class="source-view">' +
                '<p class="type-select-header"></p>'+
                '<select id="' + sourceId + '" class="type-mapper-combo">' +
                '<option value="-1">-- Select Source --</option>' +
                '</select>' +
                ' <span id="btn-add-source" class="btn-add-type fw-stack fw-lg btn btn-add">' +
                '            <i class="fw fw-add fw-stack-1x"></i>' +
                '          </span>' +
                '</div><div class="leftType"></div>');

        let middleContent = $('<div class="middle-content"></div>');

        let targetContent = $(
                '<div class="target-view">' +
                '<p class="type-select-header"></p>'+
                '<select id="' + targetId + '" class="type-mapper-combo">' +
                '<option value="-1">-- Select Target --</option>' +
                '</select>' +
                ' <span id="btn-add-target" class="btn-add-type fw-stack fw-lg btn btn-add">' +
                '            <i class="fw fw-add fw-stack-1x"></i>' +
                '          </span>' +
                '</div><div class="rightType"></div>');

        let transformNameText = $('<p class="transform-header-text ">'
                                + '<i class="transform-header-icon fw fw-type-converter"></i>Transform</p>');
        let transformHeader = $('<div id ="transformHeader" class ="transform-header">'
                                + '<i class="fw fw-left-arrow icon close-transform"></i></div>');
        let transformHeaderPadding = $('<div id ="transformHeaderPadding" class ="transform-header-padding"></div>');
        let transformMenuDiv = $('<div id ="transformContextMenu" class ="transformContextMenu"></div>');

        let transformOverlayContent = $('<div id = "transformOverlay-content" class="transformOverlay-content">' +
                                              '    </div>');

        let transformOverlay = $('<div id="transformOverlay" class="transformOverlay">' +
                                     '  </div>');
        let transformFooter = $('<div id ="transformFooter" class ="transform-footer"></div>');

        transformOverlayContent.append(transformHeader);
        transformHeader.append(transformNameText);
        transformOverlayContent.append(transformHeaderPadding);
        transformOverlayContent.append(sourceContent);
        transformOverlayContent.append(middleContent);
        transformOverlayContent.append(targetContent);
        transformOverlay.append(transformOverlayContent);
        transformOverlayContent.append(transformMenuDiv);
        transformOverlayContent.append(transformFooter);
        $('#tab-content-wrapper').append(transformOverlay);

        this.transformOverlayDiv = document.getElementById('transformOverlay');
        this.transformOverlayContentDiv = document.getElementById('transformOverlay-content');

        this.transformOverlayContentDiv.addEventListener('mouseover', (e) => {
            this.onTransformDropZoneActivate(e);
        });

        this.transformOverlayContentDiv.addEventListener('mouseout', (e) => {
	        this.onTransformDropZoneDeactivate(e);
        });

        let span = document.getElementsByClassName('close-transform')[0];

        this.predefinedStructs = [];
        let transformIndex = this.props.model.parent.getIndexOfChild(this.props.model);

        //getting variables and arguments
        let variables = this.props.model.filterChildrenInScope(
                                     this.props.model.getFactory().isVariableDefinitionStatement)
        let argHolders = this.props.model.filterChildrenInScope(
                                     this.props.model.getFactory().isArgumentParameterDefinitionHolder)
        let paramArgs = [];
        _.forEach(argHolders, argHolder => {
            _.forEach(argHolder.getChildren(), arg => {
                paramArgs.push(arg);
            });
        });

        let transformVars = this.getTransformVarJson(variables.concat(paramArgs));

        _.forEach(transformVars,(arg) => {
            let isStruct = false;
            _.forEach(this._package.getStructDefinitions(), (predefinedStruct) => {
                if (arg.type == predefinedStruct.getStructName()) {
                    let struct = self.createType(arg.name, arg.type, predefinedStruct);
                    self.loadSchemaToComboBox(sourceId, struct.name, struct.typeName);
                    self.loadSchemaToComboBox(targetId, struct.name, struct.typeName);
                    isStruct = true;
                }
            });

            if (!isStruct) {
                let variableType = {};
                variableType.id = arg.id;
                variableType.name = arg.name;
                variableType.type = arg.type;
                self.predefinedStructs.push(variableType);
                self.loadSchemaToComboBox(sourceId, variableType.name, variableType.type);
                self.loadSchemaToComboBox(targetId, variableType.name, variableType.type);
            }
        });
        $('.type-mapper-combo').select2();

        $('#btn-add-source').click((e) => {
            let currentSelection = $('#' + sourceId).val();
            let inputDef = BallerinaASTFactory
                                    .createSimpleVariableReferenceExpression({ variableName: currentSelection });
            if (self.setSource(currentSelection, self.predefinedStructs, self.props.model, inputDef.id)) {
                let inputs = self.props.model.getInput();
                inputs.push(inputDef);
                self.props.model.setInput(inputs);
            }
        });

        $('#btn-add-target').click((e) => {
            let currentSelection = $('#' + targetId).val();
            let outDef = BallerinaASTFactory
                                    .createSimpleVariableReferenceExpression({ variableName: currentSelection });
            if (self.setTarget(currentSelection, self.predefinedStructs, self.props.model, outDef.id)) {
                let outputs = self.props.model.getOutput();
                outputs.push(outDef);
                self.props.model.setOutput(outputs);
            }
        });

        $(window).on('resize', () => {
            self.mapper.reposition(self.mapper);
        });

        $('.leftType, .rightType, .middle-content').on('scroll', () => {
            self.mapper.reposition(self.mapper);
        });

        span.onclick =  () => {
            document.getElementById('transformOverlay').style.display = 'none';
            $(transformOverlay).remove();
            this.context.editor.setTransformState(false);
        };

        let onConnectionCallback = function(connection) {
            //on creating a connection
            let sourceStruct = _.find(self.predefinedStructs, { name:connection.sourceStruct});
            let targetStruct = _.find(self.predefinedStructs, { name:connection.targetStruct});
            var sourceExpression;
            var targetExpression;

            if (sourceStruct !== undefined) {
                sourceExpression = self.getStructAccessNode(connection.sourceStruct, connection.sourceProperty, (sourceStruct.type === 'struct'));
            }
            if (targetStruct !== undefined) {
                targetExpression = self.getStructAccessNode(connection.targetStruct, connection.targetProperty, (targetStruct.type == 'struct'));
            }

            if (!_.isUndefined(sourceStruct) && !_.isUndefined(targetStruct)) {
                //Connection is from source struct to target struct.
                let assignmentStmt = BallerinaASTFactory.createAssignmentStatement();
                let leftOperand = BallerinaASTFactory.createLeftOperandExpression();
                leftOperand.addChild(targetExpression);
                let rightOperand = BallerinaASTFactory.createRightOperandExpression();
                rightOperand.addChild(sourceExpression);
                assignmentStmt.addChild(leftOperand);
                assignmentStmt.addChild(rightOperand);
                self.props.model.addChild(assignmentStmt);
                return assignmentStmt.id;
            } else if (!_.isUndefined(sourceStruct) && _.isUndefined(targetStruct)) {
                // Connection source is not a struct and target is a struct.
                // Source could be a function node.
                let assignmentStmtSource = self.findEnclosingAssignmentStatement(connection.targetReference.id);
                assignmentStmtSource.getChildren()[1].getChildren()[0].addChild(sourceExpression);
                return assignmentStmtSource.id;
            } else if (_.isUndefined(sourceStruct) && !_.isUndefined(targetStruct)) {
                // Connection target is not a struct and source is a struct.
                // Target is a function node.
                let assignmentStmtTarget = self.findEnclosingAssignmentStatement(connection.sourceReference.id);
                assignmentStmtTarget.getChildren()[0].addChild(targetExpression);
                return assignmentStmtTarget.id;
            } else {
                // Connection source and target are not structs
                // Source and target are function nodes.

                // target reference might be function invocation expression or assignment statement
                // based on how the nested invocation is drawn. i.e. : adding two function nodes and then drawing
                // will be different from removing a param from a function and then drawing the connection
                // to the parent function invocation.
                let assignmentStmtTarget = self.getParentAssignmentStmt(connection.targetReference);

                let assignmentStmtSource = connection.sourceReference;
                assignmentStmtTarget.getRightExpression().getChildren()[0].addChild(assignmentStmtSource.getRightExpression().getChildren()[0]);

                //remove the source assignment statement since it is now included in the target assignment statement.
                let transformStmt = assignmentStmtSource.getParent();
                transformStmt.removeChild(assignmentStmtSource);

                return assignmentStmtTarget.id;
            }
            
        };

        let onDisconnectionCallback = function (connection) {
            // on removing a connection
            const sourceStruct = _.find(self.predefinedStructs, { name: connection.sourceStruct });
            const targetStruct = _.find(self.predefinedStructs, { name: connection.targetStruct });

            let sourceExpression, targetExpression;

            if (targetStruct !== undefined){
                sourceExpression = self.getStructAccessNode(connection.targetStruct, connection.targetProperty, (targetStruct.type === 'struct'));
            } else {
                sourceExpression = self.getStructAccessNode(connection.targetStruct, connection.targetProperty, false);
            }

            if (sourceStruct !== undefined) {
                targetExpression = self.getStructAccessNode(connection.sourceStruct, connection.sourceProperty, (sourceStruct.type === 'struct'));
            } else {
                targetExpression = self.getStructAccessNode(connection.sourceStruct, connection.sourceProperty, false);
            }

            if (!_.isUndefined(sourceStruct) && !_.isUndefined(targetStruct)) {
                const assignmentStmt = _.find(self.props.model.children, { id: connection.id });
                self.props.model.removeChild(assignmentStmt);
            } else if (!_.isUndefined(sourceStruct) && _.isUndefined(targetStruct)) {
                // Connection source is not a struct and target is a struct.
                // Source is a function node.
                const assignmentStmtSource = self.findEnclosingAssignmentStatement(connection.targetReference.id);

                // get the function invocation expression for nested and single cases.
                const funcInvocationExpression = self.findFunctionInvocationById(assignmentStmtSource.getRightExpression(), connection.targetReference.id);
                let expression = _.find(funcInvocationExpression.getChildren(), (child) => {
                    return (child.getExpressionString().trim() === targetExpression.getExpressionString().trim());
                });
                funcInvocationExpression.removeChild(expression);
            } else if (_.isUndefined(sourceStruct) && !_.isUndefined(targetStruct)) {
                // Connection target is not a struct and source is a struct.
                // Target could be a function node.
                const assignmentStmtTarget = self.findEnclosingAssignmentStatement(connection.sourceReference.id);
                let expression = _.find(assignmentStmtTarget.getLeftExpression().getChildren(), (child) => {
                    return (child.getExpressionString().trim() === sourceExpression.getExpressionString().trim());
                });
                assignmentStmtTarget.getLeftExpression().removeChild(expression);
            } else {
                // Connection source and target are not structs
                // Source and target could be function nodes.
                let targetFuncInvocationExpression = connection.targetReference;
                let sourceFuncInvocationExpression = connection.sourceReference;

                targetFuncInvocationExpression.removeChild(sourceFuncInvocationExpression);
            }
        };

        this.mapper = new TransformRender(onConnectionCallback, onDisconnectionCallback);
        this.transformOverlayDiv.style.display = 'block';

        _.forEach(self.props.model.getInput(), (input) => {
            //trim expression to remove any possible white spaces
            self.setSource(input.getExpressionString().trim(), self.predefinedStructs);
        });

        _.forEach(self.props.model.getOutput(), (output) => {
            //trim expression to remove any possible white spaces
            self.setTarget(output.getExpressionString().trim(), self.predefinedStructs);
        });

        _.forEach(this.props.model.getChildren(), (statement) => {
            this.createConnection(statement);
        });

        this.props.model.on('child-added', (node) => {
            if (BallerinaASTFactory.isAssignmentStatement(node) &&
					BallerinaASTFactory.isFunctionInvocationExpression(node.getChildren()[1].getChildren()[0])) {
                const functionInvocationExpression = node.getChildren()[1].getChildren()[0];
                const func = this.getFunctionDefinition(functionInvocationExpression);
                if (_.isUndefined(func)) {
                    alerts.error('Function definition for "' + functionInvocationExpression.getFunctionName() + '" cannot be found');
                    return;
                }
                this.mapper.addFunction(func, node, node.getParent().removeChild.bind(node.getParent()));

                // remove function invocation parameters
                _.remove(functionInvocationExpression.getChildren());
            }
        });

        // update the tool palette.
        this.context.editor.setTransformState(true);
    }

    getFunctionDefinition(functionInvocationExpression) {
        const funPackage = this.context.renderingContext.packagedScopedEnvironemnt.getPackageByName(
						functionInvocationExpression.getFullPackageName());
        return funPackage.getFunctionDefinitionByName(functionInvocationExpression.getFunctionName());
    }

    createConnection(statement) {
        if (BallerinaASTFactory.isAssignmentStatement(statement)) {
            // There can be multiple left expressions.
            // E.g. : e.name, e.username = p.first_name;
            const leftExpressions = statement.getChildren()[0];
            const rightExpression = statement.getChildren()[1].getChildren()[0];

            if (BallerinaASTFactory.isFieldBasedVarRefExpression(rightExpression) ||
                  BallerinaASTFactory.isSimpleVariableReferenceExpression(rightExpression)) {
                _.forEach(leftExpressions.getChildren(), (expression) => {
                    const target = this.getConnectionProperties('target', expression);
                    const source = this.getConnectionProperties('source', rightExpression);
                    this.drawConnection(statement.getID(), source, target);
                });
            } else if (BallerinaASTFactory.isFunctionInvocationExpression(rightExpression)) {
                // draw the function nodes first to fix issues related to rendering arrows with function nodes
                // not yet drawn in nested cases. TODO : introduce a pooling mechanism to avoid this.
                this.drawFunctionDefinitionNodes(rightExpression, statement);
                this.drawFunctionInvocationExpression(leftExpressions, rightExpression, statement);
            } else {
                log.error('Invalid expression type in transform statement body');
            }
        } else if (BallerinaASTFactory.isCommentStatement(statement)) {
            //ignore comment statements
        } else {
            log.error('Invalid statement type in transform statement');
        }
    }

    drawFunctionDefinitionNodes(functionInvocationExpression, statement) {
        const func = this.getFunctionDefinition(functionInvocationExpression);
        if (_.isUndefined(func)) {
            alerts.error('Function definition for "' + functionInvocationExpression.getFunctionName() + '" cannot be found');
            return;
        }

        if (func.getParameters().length !== functionInvocationExpression.getChildren().length) {
            alerts.warn('Function inputs and mapping count does not match in "' + func.getName() + '"');
        } else {
            const funcTarget = this.getConnectionProperties('target', functionInvocationExpression);
            _.forEach(functionInvocationExpression.getChildren(), (expression) => {
                if (BallerinaASTFactory.isFunctionInvocationExpression(expression)) {
                    this.drawInnerFunctionDefinitionNodes(functionInvocationExpression, expression, statement);
                }
            });
        }

        //Removing this node means removing the assignment statement from the transform statement, since this is the top most invocation.
        //Hence passing the assignment statement as remove reference.
        this.mapper.addFunction(func, functionInvocationExpression, statement.getParent().removeChild.bind(statement.getParent()), statement);
    }

    drawInnerFunctionDefinitionNodes(parentFunctionInvocationExpression, functionInvocationExpression, statement) {
        const func = this.getFunctionDefinition(functionInvocationExpression);
            if (_.isUndefined(func)) {
                alerts.error('Function definition for "' + functionInvocationExpression.getFunctionName() + '" cannot be found');
                return;
        }

        if (func.getParameters().length !== functionInvocationExpression.getChildren().length) {
            alerts.warn('Function inputs and mapping count does not match in "' + func.getName() + '"');
        } else {
            const funcTarget = this.getConnectionProperties('target', functionInvocationExpression);
            _.forEach(functionInvocationExpression.getChildren(), (expression) => {
                if (BallerinaASTFactory.isFunctionInvocationExpression(expression)) {
                    this.drawInnerFunctionDefinitionNodes(functionInvocationExpression, expression, statement);
                }
            });
        }

        //Removing this node means removing the function invocation from the parent function invocation.
        //Hence passing the current function invocation as remove reference.
        this.mapper.addFunction(func, functionInvocationExpression, parentFunctionInvocationExpression.removeChild.bind(parentFunctionInvocationExpression), functionInvocationExpression);
    }

    drawInnerFunctionInvocationExpression(functionInvocationExpression, parentFunctionInvocationExpression,
                                                      parentFunctionDefinition, parentParameterIndex, statement) {
        const func = this.getFunctionDefinition(functionInvocationExpression);
        if (_.isUndefined(func)) {
            alerts.error('Function definition for "' + functionInvocationExpression.getFunctionName() + '" cannot be found');
            return;
        }

        if (func.getParameters().length !== functionInvocationExpression.getChildren().length) {
            alerts.warn('Function inputs and mapping count does not match in "' + func.getName() + '"');
        } else {
            const funcTarget = this.getConnectionProperties('target', functionInvocationExpression);
            _.forEach(functionInvocationExpression.getChildren(), (expression, i) => {
                if (BallerinaASTFactory.isFunctionInvocationExpression(expression)) {
                    this.drawInnerFunctionInvocationExpression(functionInvocationExpression, expression, func, i, statement);
                } else {
                    const target = this.getConnectionProperties('target', func.getParameters()[i]);
                    _.merge(target, funcTarget); // merge parameter props with function props
                    const source = this.getConnectionProperties('source', expression);
                    this.drawConnection(statement.getID() + functionInvocationExpression.getID(), source, target);
                }
            });
        }

        if (parent !== undefined) {
            const funcSource = this.getConnectionProperties('source', functionInvocationExpression);
            const funcSourceParam = this.getConnectionProperties('source', func.getReturnParams()[0]);
            _.merge(funcSource, funcSourceParam); // merge parameter props with function props

            const funcTarget = this.getConnectionProperties('target', parentFunctionInvocationExpression);
            const funcTargetParam = this.getConnectionProperties('target', parentFunctionDefinition.getParameters()[parentParameterIndex]);
            _.merge(funcTarget, funcTargetParam); // merge parameter props with function props

            this.drawConnection(statement.getID() + functionInvocationExpression.getID(), funcSource, funcTarget);
        }

        //TODO : draw function node here when connection pooling for nested functions is implemented.
    }

    drawFunctionInvocationExpression(argumentExpressions, functionInvocationExpression, statement) {
        const func = this.getFunctionDefinition(functionInvocationExpression);
        if (_.isUndefined(func)) {
            alerts.error('Function definition for "' + functionInvocationExpression.getFunctionName() + '" cannot be found');
            return;
        }

        if (func.getParameters().length !== functionInvocationExpression.getChildren().length) {
            alerts.warn('Function inputs and mapping count does not match in "' + func.getName() + '"');
        } else {
            const funcTarget = this.getConnectionProperties('target', functionInvocationExpression);
            _.forEach(functionInvocationExpression.getChildren(), (expression, i) => {
                if (BallerinaASTFactory.isFunctionInvocationExpression(expression)) {
                    this.drawInnerFunctionInvocationExpression(expression, functionInvocationExpression, func, i, statement);
                } else {
                    const target = this.getConnectionProperties('target', func.getParameters()[i]);
                    _.merge(target, funcTarget); // merge parameter props with function props
                    const source = this.getConnectionProperties('source', expression);
                    this.drawConnection(statement.getID() + functionInvocationExpression.getID(), source, target);
                }
            });
        }

        if (func.getReturnParams().length !== argumentExpressions.getChildren().length) {
            alerts.warn('Function inputs and mapping count does not match in "' + func.getName() + '"');
        } else {
            const funcSource = this.getConnectionProperties('source', functionInvocationExpression);
            _.forEach(argumentExpressions.getChildren(), (expression, i) => {
                const source = this.getConnectionProperties('source', func.getReturnParams()[i]);
                _.merge(source, funcSource); // merge parameter props with function props
                const target = this.getConnectionProperties('target', expression);
                this.drawConnection(statement.getID() + functionInvocationExpression.getID(), source, target);
            });
        }

        //TODO : draw function node here when connection pooling for nested functions is implemented.
    }

    getConnectionProperties(type, expression) {
        const con = {};
        if (BallerinaASTFactory.isFieldBasedVarRefExpression(expression)) {
            const structVarRef = expression.getStructVariableReference();
            con[type + 'Struct'] = structVarRef.getVariableName();
            const complexProp = this.createComplexProp(con[type + 'Struct'], structVarRef.getParent());
            con[type + 'Type'] = complexProp.types;
            con[type + 'Property'] = complexProp.names;
        } else if (BallerinaASTFactory.isFunctionInvocationExpression(expression)) {
            con[type + 'Function'] = true;
            if (_.isNull(expression.getPackageName())) {
                // for current package, where package name is null
                const packageName = expression.getFullPackageName().replace(' ', '');
                con[type + 'Struct'] = packageName + '-' + expression.getFunctionName();
            } else {
                const packageName = expression.getPackageName().replace(' ', '');
                con[type + 'Struct'] = packageName + '-' + expression.getFunctionName();
            }
            con[type + 'Id'] = expression.getID();
        } else if (BallerinaASTFactory.isSimpleVariableReferenceExpression(expression)) {
            con[type + 'Struct'] = expression.getVariableName();
            const varRef = _.find(self.predefinedStructs, { name: expression.getVariableName() });
            if (!_.isUndefined(varRef)) {
                con[type + 'Type'] = [varRef.type];
            }
            con[type + 'Property'] = [expression.getVariableName()];
        } else if (['name', 'type'].every(prop => prop in expression)) {
            con[type + 'Property'] = [expression.name];
            con[type + 'Type'] = [expression.type];
        } else if (_.has(expression, 'type')) {
            con[type + 'Property'] = [undefined];
            con[type + 'Type'] = [expression.type];
        } else {
            log.error('Unknown type to define connection properties');
        }
        return con;
    }

    drawConnection(id, source, target) {
        const con = { id: id };
        _.merge(con, source, target);
        self.mapper.addConnection(con);
    }

    /**
     * @param {any} UUID of an assignment statement
     * @returns {AssignmentStatement} assignment statement for maching ID
     *
     * @memberof TransformStatementDecorator
     */
    findExistingAssignmentStatement(id) {
        return _.find(self.props.model.getChildren(), (child) => {
            return child.getID() === id;
        });
    }

    /**
    *
    * Gets the enclosing assignment statement.
    *
    * @param {any} expression
    * @returns {AssignmentStatement} enclosing assignment statement
    * @memberof TransformStatementDecorator
    */
    getParentAssignmentStmt(node) {
        if (BallerinaASTFactory.isAssignmentStatement(node)){
            return node;
        } else {
            return this.getParentAssignmentStmt(node.getParent());
        }
    }

    /**
     * @param {any} UUID of a function invocation statement
     * @returns {AssignmentStatement} enclosing assignment statement containing the matching function
     * invocation statement ID
     *
     * @memberof TransformStatementDecorator
     */
    findEnclosingAssignmentStatement(id) {
        let assignmentStmts = self.props.model.getChildren();
        let assignmentStmt = this.findExistingAssignmentStatement(id);
        if (assignmentStmt === undefined) {
            return _.find(assignmentStmts, (assignmentStmt) => {
                let expression = this.findFunctionInvocationById(assignmentStmt.getRightExpression(), id);
                if (expression !== undefined) {
                    return assignmentStmt;
                }
            });
        } else {
            return assignmentStmt;
        }
    }

    findFunctionInvocationById(expression, id) {
        let found = expression.getChildById(id);
        if (found !== undefined) {
            return found;
        } else {
            _.forEach(expression.getChildren(), (child) => {
                found = this.findFunctionInvocationById(child, id);
                if (found !== undefined) {
                    return found;
                }
            });
            return found;
        }
    }

    createComplexProp(structName, expression)    {
        let prop = {};
        prop.names = [];
        prop.types = [];

        if (BallerinaASTFactory.isFieldBasedVarRefExpression(expression)) {
            let fieldName = expression.getFieldName();
            const structDef = _.find(self.predefinedStructs, { name: structName });
            if (_.isUndefined(structDef)) {
                alerts.error('Struct definition for variable "' + structName + '" cannot be found');
                return;
            }
            const structField = _.find(structDef.properties, { name: fieldName });
            if (_.isUndefined(structField)) {
                alerts.error('Struct field "' + fieldName + '" cannot be found in variable "' + structName + '"');
                return;
            }
            const structFieldType = structField.type;
            prop.types.push(structFieldType);
            prop.names.push(fieldName);

            let parentProp = this.createComplexProp(fieldName, expression.getParent());
            prop.names = [...prop.names, ...parentProp.names];
            prop.types = [...prop.types, ...parentProp.types];
        }
        return prop;
    }

    createType(name, typeName, predefinedStruct) {
        let struct = {};
        struct.name = name;
        struct.properties = [];
        struct.type = 'struct';
        struct.typeName = typeName;

        _.forEach(predefinedStruct.getVariableDefinitionStatements(), (stmt) => {
            let property = {};
            property.name = stmt.children[0].getVariableName();
            property.type = stmt.children[0].getVariableType();

            let innerStruct = _.find(self._package.getStructDefinitions(), { _structName: property.type });
            if (innerStruct != null) {
                property.innerType = self.createType(property.name, typeName, innerStruct);
            }

            struct.properties.push(property);
        });
        self.predefinedStructs.push(struct);
        return struct;
    }

    render() {
        const { viewState, expression, model } = this.props;
        const bBox = viewState.bBox;
        const innerZoneHeight = viewState.components['drop-zone'].h;

        // calculate the bBox for the statement
        this.statementBox = {};
        this.statementBox.h = bBox.h - innerZoneHeight;
        this.statementBox.y = bBox.y + innerZoneHeight;
        this.statementBox.w = bBox.w;
        this.statementBox.x = bBox.x;
        // we need to draw a drop box above and a statement box
        const text_x = bBox.x + (bBox.w / 2);
        const text_y = this.statementBox.y + (this.statementBox.h / 2);
        const expand_button_x = bBox.x + (bBox.w / 2) + 40;
        const expand_button_y = this.statementBox.y + (this.statementBox.h / 2) - 7;
        const drop_zone_x = bBox.x + (bBox.w - lifeLine.width) / 2;
        const innerDropZoneActivated = this.state.innerDropZoneActivated;
        const innerDropZoneDropNotAllowed = this.state.innerDropZoneDropNotAllowed;
        const dropZoneClassName = ((!innerDropZoneActivated) ? 'inner-drop-zone' : 'inner-drop-zone active')
                                            + ((innerDropZoneDropNotAllowed) ? ' block' : '');

        const actionBbox = new SimpleBBox();
        const fill = this.state.innerDropZoneExist ? {} : { fill: 'none' };
        const iconSize = 14;
        actionBbox.w = DesignerDefaults.actionBox.width;
        actionBbox.h = DesignerDefaults.actionBox.height;
        actionBbox.x = bBox.x + (bBox.w - actionBbox.w) / 2;
        actionBbox.y = bBox.y + bBox.h + DesignerDefaults.actionBox.padding.top;
        let statementRectClass = 'statement-rect';
        if (model.isDebugHit) {
            statementRectClass = `${statementRectClass} debug-hit`;
        }

        return (
          <g
className="statement"
          onMouseOut={this.setActionVisibility.bind(this, false)}
          onMouseOver={this.setActionVisibility.bind(this, true)}
        >
          <rect
x={drop_zone_x} y={bBox.y} width={lifeLine.width} height={innerZoneHeight}
              className={dropZoneClassName} {...fill}
              onMouseOver={e => this.onDropZoneActivate(e)}
              onMouseOut={e => this.onDropZoneDeactivate(e)} />
          <rect
x={bBox.x} y={this.statementBox.y} width={bBox.w} height={this.statementBox.h} className={statementRectClass}
              onClick={e => this.onExpand()}
            />
          <g className="statement-body">
              <text x={text_x} y={text_y} className="transform-action" onClick={e => this.onExpand()}>{expression}</text>
              <image className="transform-action-icon" x={expand_button_x} y={expand_button_y} width={iconSize} height={iconSize} onClick={e => this.onExpand()} xlinkHref={ImageUtil.getSVGIconString('expand')} />
            </g>
          <ActionBox
              bBox={actionBbox}
              show={this.state.active}
              onDelete={() => this.onDelete()}
              onJumptoCodeLine={() => this.onJumptoCodeLine()}
            />
          {		model.isBreakpoint &&
                    this.renderBreakpointIndicator()
            }
          {this.props.children}
        </g>);
    }

    setActionVisibility(show) {
        if (!this.context.dragDropManager.isOnDrag()) {
            if (show) {
                this.context.activeArbiter.readyToActivate(this);
            } else {
                this.context.activeArbiter.readyToDeactivate(this);
            }
        }
    }

    onTransformDropZoneActivate(e) {
        this.transformOverlayContentDiv = document.getElementById('transformOverlay-content');
        const dragDropManager = this.context.dragDropManager,
            dropTarget = this.props.model,
            model = this.props.model;
        if (dragDropManager.isOnDrag()) {
            if (_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)) {
                return;
            }
            dragDropManager.setActivatedDropTarget(dropTarget,
				(nodeBeingDragged) => {
					// This drop zone is for assignment statements only.
                    // Functions with atleast one return parameter is allowed to be dropped. If the dropped node
                    // is an Assignment Statement, that implies there is a return parameter . If there is no
                    // return parameter, then it is a Function Invocation Statement, which is validated with below check.
    return model.getFactory().isAssignmentStatement(nodeBeingDragged);
},
				() => {
    return dropTarget.getChildren().length;
},
            );
        }
        e.stopPropagation();
    }

    onTransformDropZoneDeactivate(e) {
        this.transformOverlayContentDiv = document.getElementById('transformOverlay-content');
        const dragDropManager = this.context.dragDropManager,
            dropTarget = this.props.model.getParent();
        if (dragDropManager.isOnDrag()) {
            if (_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)) {
                dragDropManager.clearActivatedDropTarget();
                this.setState({ innerDropZoneActivated: false, innerDropZoneDropNotAllowed: false });
            }
        }
        e.stopPropagation();
    }
    onDropZoneActivate(e) {
        const dragDropManager = this.context.dragDropManager,
            dropTarget = this.props.model.getParent(),
            model = this.props.model;
        if (dragDropManager.isOnDrag()) {
            if (_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)) {
                return;
            }
            dragDropManager.setActivatedDropTarget(dropTarget,
				(nodeBeingDragged) => {
                    // IMPORTANT: override node's default validation logic
                    // This drop zone is for statements only.
                    // Statements should only be allowed here.
    return model.getFactory().isStatement(nodeBeingDragged);
},
				() => {
    return dropTarget.getIndexOfChild(model);
},
			);
            this.setState({ innerDropZoneActivated: true,
                innerDropZoneDropNotAllowed: !dragDropManager.isAtValidDropTarget(),
            });
            dragDropManager.once('drop-target-changed', function () {
                this.setState({ innerDropZoneActivated: false, innerDropZoneDropNotAllowed: false });
            }, this);
        }
        e.stopPropagation();
    }

    onDropZoneDeactivate(e) {
        const dragDropManager = this.context.dragDropManager,
			  dropTarget = this.props.model.getParent();
        if (dragDropManager.isOnDrag()) {
            if (_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)) {
                dragDropManager.clearActivatedDropTarget();
                this.setState({ innerDropZoneActivated: false, innerDropZoneDropNotAllowed: false });
            }
        }
        e.stopPropagation();
    }

    onArrowStartPointMouseOver(e) {
        e.target.style.fill = '#444';
        e.target.style.fillOpacity = 0.5;
        e.target.style.cursor = 'url(images/BlackHandwriting.cur), pointer';
    }

    onArrowStartPointMouseOut(e) {
        e.target.style.fill = '#444';
        e.target.style.fillOpacity = 0;
    }

    onMouseDown(e) {
        const messageManager = this.context.messageManager;
        const model = this.props.model;
        const bBox = model.getViewState().bBox;
        const statement_h = this.statementBox.h;
        const messageStartX = bBox.x + bBox.w;
        const messageStartY = this.statementBox.y + statement_h / 2;
        let actionInvocation;
        if (ASTFactory.isAssignmentStatement(model)) {
            actionInvocation = model.getChildren()[1].getChildren()[0];
        } else if (ASTFactory.isVariableDefinitionStatement(model)) {
            actionInvocation = model.getChildren()[1];
        }
        messageManager.setSource(actionInvocation);
        messageManager.setIsOnDrag(true);
        messageManager.setMessageStart(messageStartX, messageStartY);

        messageManager.setTargetValidationCallback((destination) => {
            return actionInvocation.messageDrawTargetAllowed(destination);
        });

        messageManager.startDrawMessage((source, destination) => {
            source.setAttribute('_connector', destination);
        });
    }

    onMouseUp(e) {
        const messageManager = this.context.messageManager;
        messageManager.reset();
    }

    openExpressionEditor(e) {
        const options = this.props.editorOptions;
        const packageScope = this.context.renderingContext.packagedScopedEnvironemnt;
        if (options) {
            new ExpressionEditor(this.statementBox,
                text => this.onUpdate(text), options, packageScope).render(this.context.container);
        }
    }

    onUpdate(text) {
    }

    loadSchemaToComboBox(comboBoxId, name, typeName) {
        $('#' + comboBoxId).append('<option value="' + name + '">' + name + ' : ' + typeName + '</option>');
    }

    getStructAccessNode(name, property, isStruct) {
        if (!isStruct) {
            let simpleVarRefExpression = BallerinaASTFactory.createSimpleVariableReferenceExpression();
            simpleVarRefExpression.setExpressionFromString(name);
            return simpleVarRefExpression;
        } else {
            let fieldVarRefExpression = BallerinaASTFactory.createFieldBasedVarRefExpression();
            fieldVarRefExpression.setExpressionFromString(`${name}.${_.join(property, '.')}`);
            return fieldVarRefExpression;
        }
    }

    setSource(currentSelection, predefinedStructs) {
        var sourceSelection =  _.find(predefinedStructs, { name:currentSelection});
        if (_.isUndefined(sourceSelection)){
            alerts.error('Mapping source "' + currentSelection + '" cannot be found');
            return false;
        }

        const removeFunc = function(id) {
            self.mapper.removeType(id);
            _.remove(self.props.model.getInput(),(currentObject) => {
                return currentObject.getVariableName() === id;
            });
            self.removeAssignmentStatements(id, "source");
            self.props.model.setInput(self.props.model.getInput());
            var currentSelectionObj =  _.find(self.predefinedStructs, { name:id});
            currentSelectionObj.added = false;
        }

        if (!sourceSelection.added) {
            if (sourceSelection.type == 'struct') {
                self.mapper.addSourceType(sourceSelection, removeFunc);
            } else {
                self.mapper.addVariable(sourceSelection, 'source', removeFunc);
            }
            sourceSelection.added = true;
            return true;
        } 
            return false;
        
    }

    setTarget(currentSelection, predefinedStructs) {
        var targetSelection = _.find(predefinedStructs, { name: currentSelection});
        if (_.isUndefined(targetSelection)){
            alerts.error('Mapping target "' + currentSelection + '" cannot be found');
            return false;
        }

        const removeFunc = function(id) {
            self.mapper.removeType(id);
            _.remove(self.props.model.getOutput(),(currentObject) => {
                return currentObject.getVariableName() === id;
            });
            self.removeAssignmentStatements(id, "target");
            self.props.model.setOutput(self.props.model.getOutput());
            var currentSelectionObj =  _.find(self.predefinedStructs, { name:id});
            currentSelectionObj.added = false;
        }

        if (!targetSelection.added) {
            if (targetSelection.type == 'struct') {
                self.mapper.addTargetType(targetSelection, removeFunc);
            } else {
                self.mapper.addVariable(targetSelection, 'target', removeFunc);
            }
            targetSelection.added = true;
            return true;
        } 
            return false;
        
    }

    removeAssignmentStatements(id, type) {
        var index = 0;
        if(type == "source") {
            index = 1;
        }
        _.remove(self.props.model.getChildren(),(currentObject) => {
            var condition = false;
            if (currentObject.children[index].children[0].getFactory()
                           .isFieldBasedVarRefExpression(currentObject.children[index].children[0])) {
                condition = currentObject.children[index].children[0].children[0].getExpressionString() === id;
            } else {
               condition = currentObject.children[index].children[0].getVariableName() === id;
            }
            return condition;
        });
    }
}

TransformStatementDecorator.propTypes = {
    bBox: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        w: PropTypes.number.isRequired,
        h: PropTypes.number.isRequired,
    }),
    model: PropTypes.instanceOf(ASTNode).isRequired,
    expression: PropTypes.string.isRequired,
};

TransformStatementDecorator.contextTypes = {
     editor: PropTypes.instanceOf(Object).isRequired,
	 dragDropManager: PropTypes.instanceOf(DragDropManager).isRequired,
	 container: PropTypes.instanceOf(Object).isRequired,
	 renderingContext: PropTypes.instanceOf(Object).isRequired,
	 activeArbiter: PropTypes.instanceOf(ActiveArbiter).isRequired,
};

export default TransformStatementDecorator;
